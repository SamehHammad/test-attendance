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
      const { data } = await zk.getAttendances();
      await zk.disconnect();
      const records: ZKAttendanceRecord[] = (data || []).map((rec: { deviceUserId: string; recordTime: string | Date; type: number }) => ({
        deviceUserId: String(rec.deviceUserId),
        recordTime: new Date(rec.recordTime),
        type: rec.type ?? 0,
      }));
      return { success: true, data: records };
    } catch (error: unknown) {
      try { await zk.disconnect(); } catch { /* ignore */ }
      const msg = error instanceof Error ? error.message : "فشل جلب البيانات";
      return { success: false, error: msg };
    }
  }

  async getUsers(ip: string, port: number): Promise<{ success: boolean; data?: ZKUser[]; error?: string }> {
    const zk = this.createInstance(ip, port);
    try {
      await zk.createSocket();
      const { data } = await zk.getUsers();
      await zk.disconnect();
      return { success: true, data: data || [] };
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
}

export const zkService = new ZKService();
