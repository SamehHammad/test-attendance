// eslint-disable-next-line @typescript-eslint/no-require-imports
const utils = require('node-zklib/utils');

console.log("[ZK Patch] Monkey patching node-zklib utilities for robust byte-level decoding...");

const originalDecodeRecordData40 = utils.decodeRecordData40;
utils.decodeRecordData40 = (recordData: Buffer) => {
  const record = originalDecodeRecordData40(recordData);
  if (recordData.length >= 40) {
    record.type = recordData.readUInt8(31); // attendanceStateCode
    record.verifyMode = recordData.readUInt8(26); // verifyModeCode
  } else {
    record.type = 0;
    record.verifyMode = 0;
  }
  return record;
};

const originalDecodeRecordData16 = utils.decodeRecordData16;
utils.decodeRecordData16 = (recordData: Buffer) => {
  const record = originalDecodeRecordData16(recordData);
  // Handles standard 16-byte records and small 8-byte records (UDP)
  if (recordData.length >= 8) {
    record.type = recordData.readUInt8(3); // attendanceStateCode
    record.verifyMode = recordData.readUInt8(2); // verifyModeCode
  } else {
    record.type = 0;
    record.verifyMode = 0;
  }
  return record;
};
