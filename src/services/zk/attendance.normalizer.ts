import { AttendanceState, ZKAttendanceRecord } from './types';

export class AttendanceNormalizer {
  // Only drop rapid sensor bounce / duplicate retransmission (3 seconds)
  private static RAPID_DUPLICATE_THRESHOLD_MS = 3 * 1000;

  /**
   * Normalizes an array of raw attendance records.
   * 1. Filters rapid accidental sensor bounces (within 3 seconds for exact same employee and state).
   * 2. Preserves explicit device states (e.g. CHECK_IN, CHECK_OUT, BREAK_OUT, BREAK_IN, OT).
   * 3. For devices that always output 0 (CHECK_IN) or 255 (UNKNOWN), intelligently alternates
   *    In/Out scoped to the employee's calendar day so that the first punch of each day is ALWAYS Check-In.
   */
  static normalize(records: ZKAttendanceRecord[]): ZKAttendanceRecord[] {
    if (!records || records.length === 0) return [];

    // Sort chronologically
    const sortedRecords = [...records].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Detect if the device natively distinguishes check_in and check_out
    // (i.e. contains explicit check_out code 1 or other states > 0 and != 255)
    const hasExplicitOutStates = sortedRecords.some(
      (r) => r.attendanceStateCode === AttendanceState.CHECK_OUT ||
             (r.attendanceStateCode >= 1 && r.attendanceStateCode <= 5)
    );

    const employeeLastRecord = new Map<string, ZKAttendanceRecord>();
    const employeeDayPunchCount = new Map<string, number>();
    const normalized: ZKAttendanceRecord[] = [];

    for (const record of sortedRecords) {
      const empId = record.employeeId || record.deviceUserId;
      const lastRec = employeeLastRecord.get(empId);

      // Filter rapid duplicate punches (within 3s for the same employee)
      if (lastRec) {
        const timeDiff = record.timestamp.getTime() - lastRec.timestamp.getTime();
        if (timeDiff < this.RAPID_DUPLICATE_THRESHOLD_MS) {
          // Accidental double-tap or socket retransmission, ignore
          continue;
        }
      }

      let finalState = record.attendanceStateCode;

      if (hasExplicitOutStates) {
        // Device explicitly sends check_in (0), check_out (1), etc.
        // Respect the device's designated state, fallback 255 to 0
        if (finalState === AttendanceState.UNKNOWN || finalState > 5) {
          finalState = AttendanceState.CHECK_IN;
        }
      } else {
        // Device sends 0 for all punches or 255 for all punches (General punch mode)
        // Alternate In and Out strictly within each calendar day
        const dayKey = `${empId}_${record.timestamp.getFullYear()}-${record.timestamp.getMonth() + 1}-${record.timestamp.getDate()}`;
        const countToday = employeeDayPunchCount.get(dayKey) || 0;

        // Even punch index today (0, 2, 4...) -> Check-In
        // Odd punch index today (1, 3, 5...) -> Check-Out
        finalState = (countToday % 2 === 0) ? AttendanceState.CHECK_IN : AttendanceState.CHECK_OUT;
        employeeDayPunchCount.set(dayKey, countToday + 1);
      }

      const normalizedRecord: ZKAttendanceRecord = {
        ...record,
        attendanceStateCode: finalState,
        attendanceType: this.getAttendanceTypeString(finalState),
        type: finalState,
      };

      employeeLastRecord.set(empId, normalizedRecord);
      normalized.push(normalizedRecord);
    }

    return normalized;
  }

  private static getAttendanceTypeString(code: number): string {
    switch (code) {
      case AttendanceState.CHECK_IN: return 'check_in';
      case AttendanceState.CHECK_OUT: return 'check_out';
      case AttendanceState.BREAK_OUT: return 'break_out';
      case AttendanceState.BREAK_IN: return 'break_in';
      case AttendanceState.OT_IN: return 'overtime_in';
      case AttendanceState.OT_OUT: return 'overtime_out';
      default: return 'check_in';
    }
  }
}
