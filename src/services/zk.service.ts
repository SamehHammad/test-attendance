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
}

export const zkService = new ZKService();
