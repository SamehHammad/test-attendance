"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { formatDateTime, getAttendanceTypeLabel, getAttendanceTypeBadgeColor } from "@/lib/utils";

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/attendance").then((res) => {
      setRecords(res.data.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سجلات الحضور</h1>
          <p className="text-sm text-gray-500 mt-1">عرض جميع حركات الحضور والانصراف</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">رقم البصمة</th>
                <th className="px-6 py-4 font-medium">وقت السجل</th>
                <th className="px-6 py-4 font-medium">نوع الحركة</th>
                <th className="px-6 py-4 font-medium">الجهاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    لا توجد سجلات (قم بمزامنة الجهاز أولاً)
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{rec.deviceUserId}</td>
                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-300" dir="ltr">
                      {formatDateTime(rec.recordTime)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getAttendanceTypeBadgeColor(rec.type)}`}>
                        {getAttendanceTypeLabel(rec.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {rec.device?.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
