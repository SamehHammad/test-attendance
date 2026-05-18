// eslint-disable-next-line @typescript-eslint/no-require-imports
const ZKLib = require("node-zklib");

export interface ZKDevice {
  ip: string;
  port: number;
  timeout?: number;
  inport?: number;
}

export interface ZKAttendanceRecord {
  deviceUserId: string;
  recordTime: Date;
  type: number;
}

export interface ZKUser {
  uid: number;
  userId: string;
  name: string;
  password?: string;
  role?: number;
}

export interface ZKDeviceInfo {
  userCounts: number;
  logCounts: number;
  logCapacity: number;
}

export interface ZKUserExtended extends ZKUser {
  cardno?: string;
  group?: number;
  privilege?: number;
  enabled?: boolean;
}

export interface ZKTimezone {
  timezoneIndex: number;
  sunday: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
}

export interface ZKUserGroup {
  userSn: number;
  groupNumber: number;
}

export interface ZKDeviceState {
  state: number;
  description: string;
}

class ZKService {
  private createInstance(ip: string, port: number, timeout = 10000, inport = 4000) {
    return new ZKLib(ip, port, timeout, inport);
  }

  async testConnection(ip: string, port: number): Promise<{ success: boolean; info?: ZKDeviceInfo; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const info = await zk.getInfo();
      await zk.disconnect();
      return { success: true, info };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل الاتصال";
      return { success: false, error: msg };
    }
  }

  async getAttendance(ip: string, port: number): Promise<{ success: boolean; data?: ZKAttendanceRecord[]; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const rawData = await zk.getAttendances();
      console.log("== RAW ATTENDANCES FROM DEVICE ==", rawData);
      
      const records: ZKAttendanceRecord[] = (rawData?.data || []).map((rec: { deviceUserId: string; recordTime: string | Date; type: number }) => ({
        deviceUserId: String(rec.deviceUserId),
        recordTime: new Date(rec.recordTime),
        type: rec.type ?? 0,
      }));
      await zk.disconnect();
      return { success: true, data: records };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب البيانات";
      return { success: false, error: msg };
    }
  }

  async getSyncData(ip: string, port: number): Promise<{
    success: boolean;
    attendance?: ZKAttendanceRecord[];
    users?: ZKUser[];
    info?: ZKDeviceInfo;
    error?: string;
  }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      
      // Get attendance records
      const rawData = await zk.getAttendances();
      const records: ZKAttendanceRecord[] = (rawData?.data || []).map((rec: { deviceUserId: string; recordTime: string | Date; type: number }) => ({
        deviceUserId: String(rec.deviceUserId),
        recordTime: new Date(rec.recordTime),
        type: rec.type ?? 0,
      }));

      // Get users (optional / debug)
      let users: ZKUser[] = [];
      try {
        const rawUsers = await zk.getUsers();
        users = rawUsers?.data || [];
      } catch (err) {
        console.warn("Failed to get users during combined sync:", err);
      }

      // Get device info (optional / debug)
      let info: ZKDeviceInfo | undefined;
      try {
        info = await zk.getInfo();
      } catch (err) {
        console.warn("Failed to get device info during combined sync:", err);
      }

      await zk.disconnect();
      return {
        success: true,
        attendance: records,
        users,
        info,
      };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب البيانات من الجهاز";
      return { success: false, error: msg };
    }
  }

  async getUsers(ip: string, port: number): Promise<{ success: boolean; data?: ZKUser[]; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const rawUsers = await zk.getUsers();
      console.log("== RAW USERS FROM DEVICE ==", rawUsers);
      await zk.disconnect();
      return { success: true, data: rawUsers?.data || [] };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب المستخدمين";
      return { success: false, error: msg };
    }
  }

  async clearAttendance(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.clearAttendanceLog();
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل مسح السجلات";
      return { success: false, error: msg };
    }
  }

  async setTime(ip: string, port: number, time: Date = new Date()): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      
      const year = time.getFullYear();
      const month = time.getMonth() + 1; // 1-12
      const day = time.getDate();
      const hour = time.getHours();
      const minute = time.getMinutes();
      const second = time.getSeconds();

      // Encode time using standard ZK protocol formula
      const encoded = ((year % 100) * 12 * 31 + ((month - 1) * 31) + day - 1) * (24 * 60 * 60) +
                      (hour * 60 + minute) * 60 + second;

      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(encoded, 0);

      // CMD_SET_TIME is 202
      await zk.executeCmd(202, buf);
      
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل ضبط الوقت";
      return { success: false, error: msg };
    }
  }

  async reboot(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      
      // CMD_RESTART is 1004
      await zk.executeCmd(1004, "");
      
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل إعادة تشغيل الجهاز";
      return { success: false, error: msg };
    }
  }

  async getDeviceParameters(ip: string, port: number): Promise<{ success: boolean; data?: any; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      
      const getOpt = async (name: string) => {
        try {
          const res = await zk.executeCmd(11, name + "\0"); // CMD_OPTIONS_RRQ is 11
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

      await zk.disconnect();
      return {
        success: true,
        data: {
          serialNumber,
          mac,
          vendor,
          firmware,
          productCode,
          platform,
          cardFun,
          sdkVersion,
        },
      };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب معلمات الجهاز";
      return { success: false, error: msg };
    }
  }

  async getTime(ip: string, port: number): Promise<{ success: boolean; time?: Date; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const time = await zk.getTime();
      await zk.disconnect();
      return { success: true, time };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب وقت الجهاز";
      return { success: false, error: msg };
    }
  }

  async disableDevice(ip: string, port: number, timeout?: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      if (timeout) {
        // Disable with timeout
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(timeout, 0);
        await zk.executeCmd(1001, buf); // CMD_DISABLEDEVICE
      } else {
        await zk.disableDevice();
      }
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تعطيل الجهاز";
      return { success: false, error: msg };
    }
  }

  async enableDevice(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.enableDevice();
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تفعيل الجهاز";
      return { success: false, error: msg };
    }
  }

  async freeData(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.freeData();
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تحرير البيانات";
      return { success: false, error: msg };
    }
  }

  async clearData(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(3, ""); // CMD_CLEAR_DATA
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل مسح جميع البيانات";
      return { success: false, error: msg };
    }
  }

  async refreshData(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(1013, ""); // CMD_REFRESH_DATA
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تحديث البيانات";
      return { success: false, error: msg };
    }
  }

  async clearAdmins(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(20, ""); // CMD_CLEAR_ADMIN
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل مسح المشرفين";
      return { success: false, error: msg };
    }
  }

  async enableClock(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(57, ""); // CMD_ENABLE_CLOCK
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تفعيل الساعة";
      return { success: false, error: msg };
    }
  }

  async powerOff(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(1002, ""); // CMD_POWEROFF
      await zk.executeCmd(1000, ""); // CMD_EXIT
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل إيقاف تشغيل الجهاز";
      return { success: false, error: msg };
    }
  }

  async getDeviceState(ip: string, port: number): Promise<{ success: boolean; state?: ZKDeviceState; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const res = await zk.executeCmd(20, ""); // CMD_STATE_RRQ
      await zk.disconnect();
      
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
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب حالة الجهاز";
      return { success: false, error: msg };
    }
  }

  async getUserInfo(ip: string, port: number, userId: string): Promise<{ success: boolean; user?: ZKUserExtended; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const users = await zk.getUsers();
      await zk.disconnect();
      
      const user = users?.data?.find((u: any) => u.userId === userId);
      if (user) {
        return { success: true, user };
      }
      return { success: false, error: "المستخدم غير موجود" };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب معلومات المستخدم";
      return { success: false, error: msg };
    }
  }

  async setUser(ip: string, port: number, user: ZKUserExtended): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // Use executeCmd with CMD_USER_WRQ (5)
      // ZK protocol requires specific buffer format, not JSON
      const buf = Buffer.alloc(72);
      buf.writeUInt16LE(user.uid, 0);
      buf.write(user.userId.padEnd(8, '\0'), 2, 'utf8');
      buf.write(user.name.padEnd(24, '\0'), 10, 'utf8');
      buf.write(user.password || '', 34, 'utf8');
      buf.writeUInt8(user.role || 0, 69);
      buf.writeUInt32LE(parseInt(user.cardno || '0'), 56);
      await zk.executeCmd(5, buf);
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تعيين معلومات المستخدم";
      return { success: false, error: msg };
    }
  }

  async deleteUser(ip: string, port: number, userId: string): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // Use executeCmd with CMD_USER_DEL_RRQ (14)
      const buf = Buffer.alloc(8);
      buf.write(userId.padEnd(8, '\0'), 0, 'utf8');
      await zk.executeCmd(14, buf);
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل حذف المستخدم";
      return { success: false, error: msg };
    }
  }

  async enableUser(ip: string, port: number, userId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // Use executeCmd with CMD_ENABLE_USER (8)
      const buf = Buffer.alloc(9);
      buf.write(userId.padEnd(8, '\0'), 0, 'utf8');
      buf.writeUInt8(enabled ? 1 : 0, 8);
      await zk.executeCmd(8, buf);
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تفعيل/تعطيل المستخدم";
      return { success: false, error: msg };
    }
  }

  async getUserGroup(ip: string, port: number, userSn: number): Promise<{ success: boolean; group?: number; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_USERGRP_RRQ is 27
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(userSn, 0);
      const res = await zk.executeCmd(27, buf);
      await zk.disconnect();
      
      const group = res?.readUInt8(16) || 1;
      return { success: true, group };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب مجموعة المستخدم";
      return { success: false, error: msg };
    }
  }

  async setUserGroup(ip: string, port: number, userSn: number, groupNumber: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_USERGRP_WRQ is 28
      const buf = Buffer.alloc(5);
      buf.writeUInt8(userSn, 0);
      buf.writeUInt8(0, 1);
      buf.writeUInt8(0, 2);
      buf.writeUInt8(0, 3);
      buf.writeUInt8(groupNumber, 4);
      await zk.executeCmd(28, buf);
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تعيين مجموعة المستخدم";
      return { success: false, error: msg };
    }
  }

  async getTimezoneInfo(ip: string, port: number, timezoneIndex: number): Promise<{ success: boolean; timezone?: ZKTimezone; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_TZ_RRQ is 36
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(timezoneIndex, 0);
      const res = await zk.executeCmd(36, buf);
      await zk.disconnect();
      
      if (!res || res.length < 32) {
        return { success: false, error: "بيانات غير صالحة" };
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
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب معلومات المنطقة الزمنية";
      return { success: false, error: msg };
    }
  }

  async setTimezoneInfo(ip: string, port: number, timezone: ZKTimezone): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_TZ_WRQ is 37
      const buf = Buffer.alloc(32);
      buf.writeUInt16LE(timezone.timezoneIndex, 0);
      // Parse timezone strings and write to buffer
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
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تعيين معلومات المنطقة الزمنية";
      return { success: false, error: msg };
    }
  }

  async getUserTimezones(ip: string, port: number, userId: string): Promise<{ success: boolean; timezones?: number[]; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_USERTZ_RRQ is 52
      const res = await zk.executeCmd(52, userId);
      await zk.disconnect();
      
      if (!res || res.length < 16) {
        return { success: false, error: "بيانات غير صالحة" };
      }
      
      const timezones: number[] = [];
      for (let i = 16; i < res.length && i < 16 + 50; i++) {
        const tz = res.readUInt8(i);
        if (tz > 0) timezones.push(tz);
      }
      
      return { success: true, timezones };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب مناطق المستخدم الزمنية";
      return { success: false, error: msg };
    }
  }

  async setUserTimezones(ip: string, port: number, userId: string, timezones: number[]): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_USERTZ_WRQ is 53
      const buf = Buffer.alloc(50);
      buf.write(userId.padEnd(9, '\0'), 0, 'utf8');
      timezones.forEach((tz, i) => {
        if (i < 41) buf.writeUInt8(tz, 9 + i);
      });
      await zk.executeCmd(53, buf);
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تعيين مناطق المستخدم الزمنية";
      return { success: false, error: msg };
    }
  }

  async deleteEnrollData(ip: string, port: number, userId: string, fingerIndex: number = 0): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_DELETE_ENROLL_DATA is 13
      const buf = Buffer.alloc(4);
      buf.write(userId.padEnd(3, '\0'), 0, 'utf8');
      buf.writeUInt8(fingerIndex, 3);
      await zk.executeCmd(13, buf);
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل حذف بيانات التسجيل";
      return { success: false, error: msg };
    }
  }

  async clearSuperLog(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(12, ""); // CMD_CLEAR_SLOG
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل مسح سجلات المشرفين";
      return { success: false, error: msg };
    }
  }

  async unlockDoor(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      await zk.executeCmd(80, ""); // CMD_AC_UNLOCK
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل فتح الباب";
      return { success: false, error: msg };
    }
  }

  async getDoorState(ip: string, port: number): Promise<{ success: boolean; state?: string; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const res = await zk.executeCmd(94, ""); // CMD_GET_DOOR_STATE
      await zk.disconnect();
      
      const state = res?.readUInt8(16) === 1 ? "مفتوح" : "مغلق";
      return { success: true, state };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب حالة الباب";
      return { success: false, error: msg };
    }
  }

  async enableRealtime(ip: string, port: number): Promise<{ success: boolean; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      // CMD_REG_EVENT is 500
      await zk.executeCmd(500, Buffer.from([0xff, 0xff, 0x00, 0x00]));
      await zk.disconnect();
      return { success: true };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل تفعيل الوضع الفوري";
      return { success: false, error: msg };
    }
  }
}

export const zkService = new ZKService();
