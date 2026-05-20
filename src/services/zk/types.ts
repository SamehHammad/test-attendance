export enum AttendanceState {
  CHECK_IN = 0,
  CHECK_OUT = 1,
  BREAK_OUT = 2,
  BREAK_IN = 3,
  OT_IN = 4,
  OT_OUT = 5,
  UNKNOWN = 255
}

export enum VerifyMode {
  PASSWORD = 0,
  FINGERPRINT = 1,
  CARD = 2,
  FACE = 15,
  UNKNOWN = 255
}

export interface ZKAttendanceRecord {
  employeeId: string;
  deviceUserId: string; // Backward compatibility
  timestamp: Date;
  recordTime: Date; // Backward compatibility
  verifyModeCode: number;
  verifyType: string;
  attendanceStateCode: number;
  attendanceType: string;
  type: number; // Backward compatibility
}

export interface ZKDevice {
  ip: string;
  port: number;
  timeout?: number;
  inport?: number;
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
