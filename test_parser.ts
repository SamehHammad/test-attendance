const { AttendanceParser } = require('./src/services/zk/attendance.parser');
const { AttendanceNormalizer } = require('./src/services/zk/attendance.normalizer');

const buf = Buffer.alloc(40);
buf.writeUInt16LE(1, 0); // userSn
buf.write('111', 2, 'ascii'); // deviceUserId
buf.writeUInt8(1, 26); // verifyMode (fingerprint)

// time: 2026-05-20 12:50:03
const time = ((26) * 12 * 31 + (4) * 31 + 19) * (24 * 60 * 60) + (12 * 60 + 50) * 60 + 3;
buf.writeUInt32LE(time, 27);
buf.writeUInt8(1, 31); // attendanceState (check out)

const record = AttendanceParser.decodeRecord40(buf);
console.log('Parsed:', record);

const normalized = AttendanceNormalizer.normalize([record]);
console.log('Normalized:', normalized);
