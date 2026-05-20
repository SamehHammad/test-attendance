// eslint-disable-next-line @typescript-eslint/no-require-imports
const { REQUEST_DATA } = require('node-zklib/constants');
import { DeviceConnectionManager } from './connection.manager';
import { AttendanceParser } from './attendance.parser';
import { AttendanceNormalizer } from './attendance.normalizer';
import { 
  ZKDevice, 
  ZKAttendanceRecord, 
  ZKUserExtended, 
  ZKTimezone, 
  ZKDeviceState, 
  ZKDeviceInfo, 
  ZKUser 
} from './types';

export * from './types';
export * from './attendance.parser';
export * from './attendance.normalizer';
export * from './connection.manager';

class ZKServiceFacade {
  private async getRawAttendances(zk: any): Promise<Buffer> {
    if (zk.zklibTcp && zk.zklibTcp.socket) {
      await zk.freeData();
      const data = await zk.zklibTcp.readWithBuffer(REQUEST_DATA.GET_ATTENDANCE_LOGS);
      await zk.freeData();
      return data.data.subarray(4);
    } else if (zk.zklibUdp && zk.zklibUdp.socket) {
      await zk.freeData();
      const data = await zk.zklibUdp.readWithBuffer(REQUEST_DATA.GET_ATTENDANCE_LOGS);
      await zk.freeData();
      return data.data.subarray(4);
    }
    throw new Error("Socket isn't connected!");
  }

  private async parseAndNormalizeAttendances(zk: any): Promise<ZKAttendanceRecord[]> {
    try {
      const rawBuffer = await this.getRawAttendances(zk);
      let recordData = rawBuffer;
      const records: ZKAttendanceRecord[] = [];
      const RECORD_PACKET_SIZE = 40;

      while (recordData.length >= RECORD_PACKET_SIZE) {
        try {
          const record = AttendanceParser.decodeRecord40(recordData.subarray(0, RECORD_PACKET_SIZE));
          records.push(record);
        } catch (err) {
          console.warn("Failed to parse attendance record chunk:", err);
        }
        recordData = recordData.subarray(RECORD_PACKET_SIZE);
      }

      // In case we receive old firmware 16 byte records
      if (records.length === 0 && rawBuffer.length >= 16) {
        let recordData16 = rawBuffer;
        while (recordData16.length >= 16) {
          try {
            const record = AttendanceParser.decodeRecord16(recordData16.subarray(0, 16));
            records.push(record);
          } catch (err) {
             console.warn("Failed to parse 16-byte attendance chunk:", err);
          }
          recordData16 = recordData16.subarray(16);
        }
      }

      return AttendanceNormalizer.normalize(records);
    } catch (error) {
      console.warn("Failed to parse raw attendances, falling back to basic parsing. Error:", error);
      // Fallback
      const rawData = await zk.getAttendances();
      const records = (rawData?.data || []).map((rec: any) => ({
        employeeId: String(rec.deviceUserId),
        timestamp: new Date(rec.recordTime),
        verifyModeCode: 0,
        verifyType: 'unknown',
        attendanceStateCode: rec.type ?? 0,
        attendanceType: AttendanceParser.getAttendanceTypeString(rec.type ?? 0),
      }));
      return AttendanceNormalizer.normalize(records);
    }
  }

  async testConnection(ip: string, port: number): Promise<{ success: boolean; info?: ZKDeviceInfo; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const info = await zk.getInfo();
        return { success: true, info };
      },
      () => ({
        success: true,
        info: { userCounts: 16, logCounts: 3, logCapacity: 50000 }
      })
    );
  }

  async getAttendance(ip: string, port: number): Promise<{ success: boolean; data?: ZKAttendanceRecord[]; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const data = await this.parseAndNormalizeAttendances(zk);
        return { success: true, data };
      },
      () => ({ success: true, data: [] })
    );
  }

  async getSyncData(ip: string, port: number): Promise<{
    success: boolean;
    attendance?: ZKAttendanceRecord[];
    users?: ZKUser[];
    info?: ZKDeviceInfo;
    error?: string;
  }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const attendance = await this.parseAndNormalizeAttendances(zk);

        let users: ZKUser[] = [];
        try {
          const rawUsers = await zk.getUsers();
          users = rawUsers?.data || [];
        } catch (err) {
          console.warn("Failed to get users during combined sync:", err);
        }

        let info: ZKDeviceInfo | undefined;
        try {
          info = await zk.getInfo();
        } catch (err) {
          console.warn("Failed to get device info during combined sync:", err);
        }

        const mappedUsers = users.map((u: ZKUser) => ({
          uid: u.uid,
          userId: String(u.userId),
          name: u.name,
          role: u.role ?? 0
        }));

        const finalInfo: ZKDeviceInfo = info || {
          userCounts: users.length,
          logCounts: attendance.length,
          logCapacity: 50000
        };

        return {
          success: true,
          attendance,
          users: mappedUsers,
          info: finalInfo,
        };
      },
      () => ({
        success: true,
        attendance: [],
        users: [],
        info: { userCounts: 16, logCounts: 3, logCapacity: 50000 }
      })
    );
  }

  async getUsers(ip: string, port: number): Promise<{ success: boolean; data?: ZKUser[]; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const rawUsers = await zk.getUsers();
        return { success: true, data: rawUsers?.data || [] };
      },
      () => ({ success: true, data: [] })
    );
  }

  async clearAttendance(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.clearAttendanceLog();
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async setTime(ip: string, port: number, time: Date = new Date()): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const year = time.getFullYear();
        const month = time.getMonth() + 1;
        const day = time.getDate();
        const hour = time.getHours();
        const minute = time.getMinutes();
        const second = time.getSeconds();

        const encoded = ((year % 100) * 12 * 31 + ((month - 1) * 31) + day - 1) * (24 * 60 * 60) +
                        (hour * 60 + minute) * 60 + second;

        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(encoded, 0);

        await zk.executeCmd(202, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async reboot(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(1004, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async getDeviceParameters(ip: string, port: number): Promise<{ success: boolean; data?: any; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const getOpt = async (name: string) => {
          try {
            const res = await zk.executeCmd(11, name + "\0");
            if (res && res.length) {
              const str = res.toString("utf8").replace(/[\x00-\x1F\x7F-\x9F]/g, "");
              if (str.includes("=")) {
                return str.split("=")[1] || "N/A";
              }
              return str || "N/A";
            }
            return "N/A";
          } catch {
            return "N/A";
          }
        };

        const serialNumber = await getOpt("~SerialNumber");
        const mac = await getOpt("~MAC");
        const vendor = await getOpt("~VendorName") === "N/A" ? await getOpt("~Vendor") : await getOpt("~VendorName");
        const firmware = await getOpt("~FWVersion") === "N/A" ? await getOpt("~FRP") : await getOpt("~FWVersion");
        const productCode = await getOpt("~DeviceName") === "N/A" ? await getOpt("ProductCode") : await getOpt("~DeviceName");
        const platform = await getOpt("~Platform");
        const cardFun = await getOpt("~CardFun") === "N/A" ? await getOpt("CardFun") : await getOpt("~CardFun");
        const sdkVersion = await getOpt("~SDKVersion");

        return {
          success: true,
          data: { serialNumber, mac, vendor, firmware, productCode, platform, cardFun, sdkVersion },
        };
      },
      () => ({
        success: true,
        data: {
          serialNumber: "ZK40-MOCK-987654",
          mac: "00:17:0F:11:C3:A2",
          vendor: "ZKTeco",
          firmware: "Ver 8.0.4 Build 120",
          productCode: "K40",
          platform: "ZEM500",
          cardFun: "Enabled",
          sdkVersion: "SDK 9.0"
        }
      })
    );
  }

  async getTime(ip: string, port: number): Promise<{ success: boolean; time?: Date; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const time = await zk.getTime();
        return { success: true, time };
      },
      () => ({ success: true, time: new Date() })
    );
  }

  async disableDevice(ip: string, port: number, timeout?: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        if (timeout) {
          const buf = Buffer.alloc(4);
          buf.writeUInt32LE(timeout, 0);
          await zk.executeCmd(1001, buf);
        } else {
          await zk.disableDevice();
        }
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async enableDevice(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.enableDevice();
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async freeData(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.freeData();
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async clearData(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(3, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async refreshData(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(1013, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async clearAdmins(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(20, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async enableClock(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(57, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async powerOff(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(1002, "");
        await zk.executeCmd(1000, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async getDeviceState(ip: string, port: number): Promise<{ success: boolean; state?: ZKDeviceState; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const res = await zk.executeCmd(20, "");
        const stateCodes: { [key: number]: string } = {
          0: "في انتظار",
          1: "تسجيل بصمة",
          2: "التعرف على البصمة",
          3: "القائمة",
          4: "مشغول",
          5: "في انتظار كتابة البطاقة",
        };
        const stateCode = res?.readUInt16LE(12) || 0;
        return {
          success: true,
          state: {
            state: stateCode,
            description: stateCodes[stateCode] || "غير معروف",
          },
        };
      },
      () => ({
        success: true,
        state: { state: 0, description: "في انتظار" }
      })
    );
  }

  async getUserInfo(ip: string, port: number, userId: string): Promise<{ success: boolean; user?: ZKUserExtended; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const users = await zk.getUsers();
        const user = users?.data?.find((u: any) => String(u.userId) === String(userId));
        if (user) {
          return { success: true, user };
        }
        return { success: false, error: "المستخدم غير موجود" };
      },
      () => ({
        success: true,
        user: { uid: 1, userId: userId, name: "مستخدم تجريبي " + userId, role: 0, enabled: true }
      })
    );
  }

  async setUser(ip: string, port: number, user: ZKUserExtended): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(72);
        buf.writeUInt16LE(user.uid, 0);
        buf.write(user.userId.padEnd(8, '\0'), 2, 'utf8');
        buf.write(user.name.padEnd(24, '\0'), 10, 'utf8');
        buf.write(user.password || '', 34, 'utf8');
        buf.writeUInt8(user.role || 0, 69);
        buf.writeUInt32LE(parseInt(user.cardno || '0'), 56);
        await zk.executeCmd(5, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async deleteUser(ip: string, port: number, userId: string): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(8);
        buf.write(userId.padEnd(8, '\0'), 0, 'utf8');
        await zk.executeCmd(14, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async enableUser(ip: string, port: number, userId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(9);
        buf.write(userId.padEnd(8, '\0'), 0, 'utf8');
        buf.writeUInt8(enabled ? 1 : 0, 8);
        await zk.executeCmd(8, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async getUserGroup(ip: string, port: number, userSn: number): Promise<{ success: boolean; group?: number; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(userSn, 0);
        const res = await zk.executeCmd(27, buf);
        const group = res?.readUInt8(16) || 1;
        return { success: true, group };
      },
      () => ({ success: true, group: 1 })
    );
  }

  async setUserGroup(ip: string, port: number, userSn: number, groupNumber: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(5);
        buf.writeUInt8(userSn, 0);
        buf.writeUInt8(0, 1);
        buf.writeUInt8(0, 2);
        buf.writeUInt8(0, 3);
        buf.writeUInt8(groupNumber, 4);
        await zk.executeCmd(28, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async getTimezoneInfo(ip: string, port: number, timezoneIndex: number): Promise<{ success: boolean; timezone?: ZKTimezone; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(timezoneIndex, 0);
        const res = await zk.executeCmd(36, buf);
        if (!res || res.length < 32) {
          throw new Error("بيانات غير صالحة");
        }
        const parseTimezone = (offset: number) => {
          const b0 = res.readUInt8(offset);
          const b1 = res.readUInt8(offset + 1);
          const b2 = res.readUInt8(offset + 2);
          const b3 = res.readUInt8(offset + 3);
          return `${b0}:${b1} TO ${b2}:${b3}`;
        };
        const timezone: ZKTimezone = {
          timezoneIndex: res.readUInt16LE(16),
          sunday: parseTimezone(18),
          monday: parseTimezone(22),
          tuesday: parseTimezone(26),
          wednesday: parseTimezone(30),
          thursday: parseTimezone(34),
          friday: parseTimezone(38),
          saturday: parseTimezone(42),
        };
        return { success: true, timezone };
      },
      () => ({
        success: true,
        timezone: {
          timezoneIndex,
          sunday: "08:00 TO 17:00", monday: "08:00 TO 17:00", tuesday: "08:00 TO 17:00",
          wednesday: "08:00 TO 17:00", thursday: "08:00 TO 17:00", friday: "08:00 TO 17:00", saturday: "08:00 TO 17:00"
        }
      })
    );
  }

  async setTimezoneInfo(ip: string, port: number, timezone: ZKTimezone): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(32);
        buf.writeUInt16LE(timezone.timezoneIndex, 0);
        const parseTimezone = (tz: string, offset: number) => {
          const parts = tz.split(' TO ');
          const start = parts[0].split(':');
          const end = parts[1].split(':');
          buf.writeUInt8(parseInt(start[0]), offset);
          buf.writeUInt8(parseInt(start[1]), offset + 1);
          buf.writeUInt8(parseInt(end[0]), offset + 2);
          buf.writeUInt8(parseInt(end[1]), offset + 3);
        };
        parseTimezone(timezone.sunday, 2);
        parseTimezone(timezone.monday, 6);
        parseTimezone(timezone.tuesday, 10);
        parseTimezone(timezone.wednesday, 14);
        parseTimezone(timezone.thursday, 18);
        parseTimezone(timezone.friday, 22);
        parseTimezone(timezone.saturday, 26);
        buf.writeUInt16LE(0xa71c, 30);
        await zk.executeCmd(37, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async getUserTimezones(ip: string, port: number, userId: string): Promise<{ success: boolean; timezones?: number[]; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const res = await zk.executeCmd(52, userId);
        if (!res || res.length < 16) {
          throw new Error("بيانات غير صالحة");
        }
        const timezones: number[] = [];
        for (let i = 16; i < res.length && i < 16 + 50; i++) {
          const tz = res.readUInt8(i);
          if (tz > 0) timezones.push(tz);
        }
        return { success: true, timezones };
      },
      () => ({ success: true, timezones: [1, 2] })
    );
  }

  async setUserTimezones(ip: string, port: number, userId: string, timezones: number[]): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(50);
        buf.write(userId.padEnd(9, '\0'), 0, 'utf8');
        timezones.forEach((tz, i) => {
          if (i < 41) buf.writeUInt8(tz, 9 + i);
        });
        await zk.executeCmd(53, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async deleteEnrollData(ip: string, port: number, userId: string, fingerIndex: number = 0): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const buf = Buffer.alloc(4);
        buf.write(userId.padEnd(3, '\0'), 0, 'utf8');
        buf.writeUInt8(fingerIndex, 3);
        await zk.executeCmd(13, buf);
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async clearSuperLog(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(12, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async unlockDoor(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(80, "");
        return { success: true };
      },
      () => ({ success: true })
    );
  }

  async getDoorState(ip: string, port: number): Promise<{ success: boolean; state?: string; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        const res = await zk.executeCmd(94, "");
        const state = res?.readUInt8(16) === 1 ? "مفتوح" : "مغلق";
        return { success: true, state };
      },
      () => ({ success: true, state: "مغلق" })
    );
  }

  async enableRealtime(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    return DeviceConnectionManager.executeWithRetry(
      { ip, port },
      async (zk) => {
        await zk.executeCmd(500, Buffer.from([0xff, 0xff, 0x00, 0x00]));
        return { success: true };
      },
      () => ({ success: true })
    );
  }
}

export const zkService = new ZKServiceFacade();
