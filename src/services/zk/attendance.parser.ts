import { AttendanceState, VerifyMode, ZKAttendanceRecord } from './types';

export class AttendanceParser {
  /**
   * Translates verify mode byte to a human-readable string.
   */
  static getVerifyTypeString(code: number): string {
    switch (code) {
      case VerifyMode.PASSWORD: return 'password';
      case VerifyMode.FINGERPRINT: return 'fingerprint';
      case VerifyMode.CARD: return 'card';
      case VerifyMode.FACE: return 'face';
      default: return 'unknown';
    }
  }

  /**
   * Translates attendance state byte to a human-readable string.
   */
  static getAttendanceTypeString(code: number): string {
    switch (code) {
      case AttendanceState.CHECK_IN: return 'check_in';
      case AttendanceState.CHECK_OUT: return 'check_out';
      case AttendanceState.BREAK_OUT: return 'break_out';
      case AttendanceState.BREAK_IN: return 'break_in';
      case AttendanceState.OT_IN: return 'overtime_in';
      case AttendanceState.OT_OUT: return 'overtime_out';
      default: return 'unknown';
    }
  }

  /**
   * Parses time encoded by ZKTeco protocol
   */
  static parseTimeToDate(time: number): Date {
    const second = time % 60;
    time = (time - second) / 60;
    const minute = time % 60;
    time = (time - minute) / 60;
    const hour = time % 24;
    time = (time - hour) / 24;
    const day = time % 31 + 1;
    time = (time - (day - 1)) / 31;
    const month = time % 12;
    time = (time - month) / 12;
    const year = time + 2000;
    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Decodes a standard 40-byte attendance record buffer.
   */
  static decodeRecord40(recordData: Buffer): ZKAttendanceRecord {
    // 0-1: userSn (2 bytes)
    // 2-25: deviceUserId string
    // 26: verifyMode (1 byte)
    // 27-30: recordTime (4 bytes)
    // 31: attendanceState (1 byte)
    
    // Safety check for range error
    if (recordData.length < 40) {
      throw new RangeError(`Buffer length ${recordData.length} is less than 40 bytes.`);
    }

    const deviceUserId = recordData.slice(2, 2 + 9).toString('ascii').split('\0').shift() || '';
    const verifyModeCode = recordData.readUInt8(26);
    const recordTime = this.parseTimeToDate(recordData.readUInt32LE(27));
    const attendanceStateCode = recordData.readUInt8(31);

    return {
      employeeId: deviceUserId,
      deviceUserId: deviceUserId,
      timestamp: recordTime,
      recordTime: recordTime,
      verifyModeCode,
      verifyType: this.getVerifyTypeString(verifyModeCode),
      attendanceStateCode,
      attendanceType: this.getAttendanceTypeString(attendanceStateCode),
      type: attendanceStateCode,
    };
  }

  /**
   * Decodes a legacy 16-byte attendance record buffer.
   */
  static decodeRecord16(recordData: Buffer): ZKAttendanceRecord {
    // 0-1: deviceUserId integer (2 bytes)
    // 2: verifyMode (1 byte)
    // 3: attendanceState (1 byte)
    // 4-7: recordTime (4 bytes)
    
    if (recordData.length < 16) {
      throw new RangeError(`Buffer length ${recordData.length} is less than 16 bytes.`);
    }

    const deviceUserId = String(recordData.readUIntLE(0, 2));
    const verifyModeCode = recordData.readUInt8(2);
    const attendanceStateCode = recordData.readUInt8(3);
    const recordTime = this.parseTimeToDate(recordData.readUInt32LE(4));

    return {
      employeeId: deviceUserId,
      deviceUserId: deviceUserId,
      timestamp: recordTime,
      recordTime: recordTime,
      verifyModeCode,
      verifyType: this.getVerifyTypeString(verifyModeCode),
      attendanceStateCode,
      attendanceType: this.getAttendanceTypeString(attendanceStateCode),
      type: attendanceStateCode,
    };
  }
}
