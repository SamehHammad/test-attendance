import { AttendanceState, ZKAttendanceRecord } from './types';

export class AttendanceNormalizer {
  // Configurable duration (in milliseconds) to prevent duplicate identical punches.
  // Default: 5 minutes
  private static DUPLICATE_THRESHOLD_MS = 5 * 60 * 1000;

  /**
   * Normalizes an array of raw attendance records.
   * If a device doesn't correctly send check_out or breaks (e.g. always sends 0 or 255),
   * this algorithm will alternate check_in and check_out sequentially per employee.
   * It also removes rapid duplicate punches.
   */
  static normalize(records: ZKAttendanceRecord[]): ZKAttendanceRecord[] {
    // Sort records chronologically
    const sortedRecords = [...records].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const employeeLastState = new Map<string, ZKAttendanceRecord>();
    const normalized: ZKAttendanceRecord[] = [];

    for (const record of sortedRecords) {
      const lastRecord = employeeLastState.get(record.employeeId);

      // Prevent duplicate punches within the threshold duration
      if (lastRecord) {
        const timeDiff = record.timestamp.getTime() - lastRecord.timestamp.getTime();
        if (timeDiff < this.DUPLICATE_THRESHOLD_MS) {
          // It's a duplicate or accidental rapid punch, ignore it
          continue;
        }
      }

      // If device sends UNKNOWN or if it erroneously sends Check-In when it should alternate
      // We assume alternating behavior as a fallback if the user wants strict alternating.
      // However, if the device reliably sends CHECK_OUT, we shouldn't overwrite it unless needed.
      // Usually, problematic devices send 0 (CHECK_IN) or 255 (UNKNOWN) for everything.
      
      let finalState = record.attendanceStateCode;
      
      if (finalState === AttendanceState.UNKNOWN || finalState === AttendanceState.CHECK_IN) {
        // Fallback alternating logic
        if (lastRecord) {
          // Alternate based on the last recorded state
          if (lastRecord.attendanceStateCode === AttendanceState.CHECK_IN) {
            finalState = AttendanceState.CHECK_OUT;
          } else {
            finalState = AttendanceState.CHECK_IN;
          }
        } else {
          // First punch is check in
          finalState = AttendanceState.CHECK_IN;
        }
      }

      // Update the record with the normalized state
      const normalizedRecord: ZKAttendanceRecord = {
        ...record,
        attendanceStateCode: finalState,
        attendanceType: this.getAttendanceTypeString(finalState),
        type: finalState,
      };

      employeeLastState.set(record.employeeId, normalizedRecord);
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
      default: return 'unknown';
    }
  }
}
