"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/employees").then((res) => {
      setEmployees(res.data.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الموظفون</h1>
          <p className="text-sm text-gray-500 mt-1">عرض الموظفين المسجلين في أجهزة البصمة</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">رقم البصمة</th>
                <th className="px-6 py-4 font-medium">الاسم</th>
                <th className="px-6 py-4 font-medium">الجهاز</th>
                <th className="px-6 py-4 font-medium">عدد السجلات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    لا يوجد موظفون (قم بمزامنة الجهاز أولاً)
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{emp.deviceUserId}</td>
                    <td className="px-6 py-4">{emp.name || "-"}</td>
                    <td className="px-6 py-4 text-gray-500">{emp.device?.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs">
                        {emp._count?.attendance || 0} سجل
                      </span>
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
