/* eslint-disable @typescript-eslint/no-require-imports */
const utils = require('node-zklib/utils');
const ZKLibTCP = require('node-zklib/zklibtcp');
const { MAX_CHUNK, COMMANDS, REQUEST_DATA } = require('node-zklib/constants');

console.log("[ZK Patch] Initializing comprehensive high-performance ZKTeco protocol patch...");

// --- Robust Time Decoding ---
function parseTimeToDate(time: number): Date {
  const second = time % 60;
  time = (time - second) / 60;
  const minute = time % 60;
  time = (time - minute) / 60;
  const hour = time % 24;
  time = (time - hour) / 24;
  const day = (time % 31) + 1;
  time = (time - (day - 1)) / 31;
  const month = time % 12;
  time = (time - month) / 12;
  const year = time + 2000;
  return new Date(year, month, day, hour, minute, second);
}

// --- 40-byte Attendance Log Parser (Full 24-character user ID, real type & verifyMode) ---
utils.decodeRecordData40 = (recordData: Buffer) => {
  const userSn = recordData.length >= 2 ? recordData.readUInt16LE(0) : 0;
  
  // Bytes 2-25: deviceUserId (up to 24 characters null-padded ASCII)
  let rawUserId = '';
  if (recordData.length >= 26) {
    rawUserId = recordData.subarray(2, 26).toString('ascii').replace(/\0/g, '').trim();
  } else if (recordData.length >= 11) {
    rawUserId = recordData.subarray(2, 11).toString('ascii').replace(/\0/g, '').trim();
  }

  const verifyMode = recordData.length >= 27 ? recordData.readUInt8(26) : 0;
  
  let recordTime = new Date();
  if (recordData.length >= 31) {
    recordTime = parseTimeToDate(recordData.readUInt32LE(27));
  }

  // Byte 31: attendance state (0: Check-In, 1: Check-Out, 2: Break-Out, 3: Break-In, 4: OT-In, 5: OT-Out)
  const type = recordData.length >= 32 ? recordData.readUInt8(31) : 0;

  return {
    userSn,
    deviceUserId: rawUserId,
    recordTime,
    verifyMode,
    type,
  };
};

// --- 16-byte Legacy Attendance Log Parser ---
utils.decodeRecordData16 = (recordData: Buffer) => {
  const deviceUserId = recordData.length >= 2 ? String(recordData.readUInt16LE(0)) : '0';
  const verifyMode = recordData.length >= 3 ? recordData.readUInt8(2) : 0;
  const type = recordData.length >= 4 ? recordData.readUInt8(3) : 0;
  
  let recordTime = new Date();
  if (recordData.length >= 8) {
    recordTime = parseTimeToDate(recordData.readUInt32LE(4));
  }

  return {
    deviceUserId,
    recordTime,
    verifyMode,
    type,
  };
};

// --- 72-byte User Data Parser (Full 24-char user ID & UTF-8 / Arabic names) ---
utils.decodeUserData72 = (userData: Buffer) => {
  const uid = userData.length >= 2 ? userData.readUInt16LE(0) : 0;
  const role = userData.length >= 3 ? userData.readUInt8(2) : 0;
  const password = userData.length >= 11 ? userData.subarray(3, 11).toString('utf8').replace(/\0/g, '').trim() : '';
  
  // Name field: Bytes 11-34 (24 bytes) - supports UTF-8 Arabic characters
  let name = '';
  if (userData.length >= 35) {
    name = userData.subarray(11, 35).toString('utf8').replace(/\0/g, '').trim();
  }

  const cardno = userData.length >= 39 ? userData.readUInt32LE(35) : 0;
  
  // User ID field: Bytes 48-71 (24 bytes)
  let userId = '';
  if (userData.length >= 72) {
    userId = userData.subarray(48, 72).toString('ascii').replace(/\0/g, '').trim();
  } else if (userData.length >= 57) {
    userId = userData.subarray(48, 57).toString('ascii').replace(/\0/g, '').trim();
  } else {
    userId = String(uid);
  }

  return {
    uid,
    role,
    password,
    name: name || `مستخدم ${userId}`,
    cardno,
    userId,
  };
};

// --- Patch ZKLibTCP.prototype.readWithBuffer ---
// Fixes: Multi-chunk packet loss, remain === 0 hang bug, memory leak on data listeners, and short timeouts
ZKLibTCP.prototype.readWithBuffer = function (reqData: any, cb: ((len: number, total: number) => void) | null = null) {
  return new Promise(async (resolve, reject) => {
    this.replyId++;
    const buf = utils.createTCPHeader(COMMANDS.CMD_DATA_WRRQ, this.sessionId, this.replyId, reqData);
    let reply: any = null;

    try {
      reply = await this.requestData(buf);
    } catch (err) {
      return reject(err);
    }

    if (!reply || reply.length < 16) {
      return reject(new Error('Invalid TCP reply header'));
    }

    const header = utils.decodeTCPHeader(reply.subarray(0, 16));

    switch (header.commandId) {
      case COMMANDS.CMD_DATA: {
        return resolve({ data: reply.subarray(16), mode: 8 });
      }

      case COMMANDS.CMD_ACK_OK:
      case COMMANDS.CMD_PREPARE_DATA: {
        const recvData = reply.subarray(16);
        const size = recvData.length >= 5 ? recvData.readUIntLE(1, 4) : 0;

        if (size <= 0) {
          return resolve({ data: Buffer.alloc(0), err: null });
        }

        // Build list of expected chunks
        const chunkList: { offset: number; size: number }[] = [];
        let offset = 0;
        while (offset < size) {
          const chunkSize = Math.min(MAX_CHUNK, size - offset);
          chunkList.push({ offset, size: chunkSize });
          offset += chunkSize;
        }

        let totalBuffer = Buffer.alloc(0);
        let realTotalBuffer = Buffer.alloc(0);
        let replyData = Buffer.alloc(0);
        let currentChunkIndex = 0;
        let isDone = false;

        const timeoutMs = 25000; // Generous 25s activity timeout
        let timer: any = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (this.socket) {
            this.socket.removeListener('data', handleOnData);
            this.socket.removeListener('close', handleOnClose);
          }
        };

        const resetTimer = () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            if (!isDone) {
              isDone = true;
              cleanup();
              // Return whatever data arrived rather than outright crashing
              resolve({
                data: replyData,
                err: new Error(`TIMEOUT: Received ${replyData.length}/${size} bytes (${currentChunkIndex}/${chunkList.length} chunks)`),
              });
            }
          }, timeoutMs);
        };

        const handleOnClose = () => {
          if (!isDone) {
            isDone = true;
            cleanup();
            resolve({
              data: replyData,
              err: new Error('Socket closed unexpectedly during data transfer'),
            });
          }
        };

        const handleOnData = (chunkData: Buffer) => {
          if (isDone) return;
          if (utils.checkNotEventTCP(chunkData)) return;

          resetTimer();

          totalBuffer = Buffer.concat([totalBuffer, chunkData]);

          while (totalBuffer.length >= 8) {
            const packetLength = totalBuffer.readUIntLE(4, 2);
            if (totalBuffer.length < 8 + packetLength) {
              break; // Wait for full packet to arrive
            }

            if (packetLength > 8) {
              // Strip 16-byte TCP wrapper
              realTotalBuffer = Buffer.concat([
                realTotalBuffer,
                totalBuffer.subarray(16, 8 + packetLength),
              ]);
            }
            totalBuffer = totalBuffer.subarray(8 + packetLength);

            // Check if chunks have been satisfied
            while (currentChunkIndex < chunkList.length) {
              const expectedSize = chunkList[currentChunkIndex].size;
              if (realTotalBuffer.length >= expectedSize + 8) {
                const chunkPayload = realTotalBuffer.subarray(8, expectedSize + 8);
                replyData = Buffer.concat([replyData, chunkPayload]);
                realTotalBuffer = realTotalBuffer.subarray(expectedSize + 8);
                currentChunkIndex++;
                if (cb) cb(replyData.length, size);
              } else {
                break;
              }
            }

            if (currentChunkIndex >= chunkList.length || replyData.length >= size) {
              isDone = true;
              cleanup();
              return resolve({ data: replyData, err: null });
            }
          }
        };

        this.socket.once('close', handleOnClose);
        this.socket.on('data', handleOnData);

        resetTimer();

        // Send all chunk requests
        for (const chunk of chunkList) {
          this.sendChunkRequest(chunk.offset, chunk.size);
        }

        break;
      }

      default: {
        return reject(new Error('ERROR_IN_UNHANDLE_CMD ' + utils.exportErrorMessage(header.commandId)));
      }
    }
  });
};

// --- Patch ZKLibTCP.prototype.getAttendances ---
ZKLibTCP.prototype.getAttendances = async function (callbackInProcess = () => {}) {
  if (this.socket) {
    try {
      await this.freeData();
    } catch {}
  }

  let data: any = null;
  try {
    data = await this.readWithBuffer(REQUEST_DATA.GET_ATTENDANCE_LOGS, callbackInProcess);
  } catch (err) {
    return Promise.reject(err);
  }

  if (this.socket) {
    try {
      await this.freeData();
    } catch {}
  }

  if (!data || !data.data || data.data.length === 0) {
    return { data: [], err: data?.err };
  }

  let recordData: Buffer = data.data.subarray(4);
  const records: any[] = [];

  // Auto-detect packet format: 40 bytes or 16 bytes
  const is40Byte = recordData.length % 40 === 0 || (recordData.length >= 40 && recordData.length % 16 !== 0);
  const RECORD_SIZE = is40Byte ? 40 : 16;

  while (recordData.length >= RECORD_SIZE) {
    const rawRecord = recordData.subarray(0, RECORD_SIZE);
    const decoded = RECORD_SIZE === 40 
      ? utils.decodeRecordData40(rawRecord) 
      : utils.decodeRecordData16(rawRecord);

    if (decoded.deviceUserId) {
      records.push({ ...decoded, ip: this.ip });
    }
    recordData = recordData.subarray(RECORD_SIZE);
  }

  return { data: records, err: data.err };
};

// --- Patch ZKLibTCP.prototype.getUsers ---
ZKLibTCP.prototype.getUsers = async function () {
  if (this.socket) {
    try {
      await this.freeData();
    } catch {}
  }

  let data: any = null;
  try {
    data = await this.readWithBuffer(REQUEST_DATA.GET_USERS);
  } catch (err) {
    return Promise.reject(err);
  }

  if (this.socket) {
    try {
      await this.freeData();
    } catch {}
  }

  if (!data || !data.data || data.data.length === 0) {
    return { data: [], err: data?.err };
  }

  const USER_PACKET_SIZE = 72;
  let userData: Buffer = data.data.subarray(4);
  const users: any[] = [];

  while (userData.length >= USER_PACKET_SIZE) {
    const rawUser = userData.subarray(0, USER_PACKET_SIZE);
    const user = utils.decodeUserData72(rawUser);
    if (user.userId) {
      users.push(user);
    }
    userData = userData.subarray(USER_PACKET_SIZE);
  }

  return { data: users, err: data.err };
};

console.log("[ZK Patch] Protocol patch applied successfully.");
