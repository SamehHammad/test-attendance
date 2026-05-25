"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/employees")
      .then((res) => {
        setEmployees(res.data.data ?? []);
      })
      .catch(() => {
        setEmployees([]);
        toast.error("فشل تحميل الموظفين. تحقق من الاتصال بقاعدة البيانات.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الموظفون</h1>
          <p className="text-sm text-gray-500 mt-1">عرض الموظفين المسجلين في أجهزة البصمة</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-100 text-gray-800 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold">رقم البصمة</th>
                <th className="px-6 py-4 font-bold">الاسم</th>
                <th className="px-6 py-4 font-bold">الجهاز</th>
                <th className="px-6 py-4 font-bold">عدد السجلات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{emp.deviceUserId}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{emp.name || "-"}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{emp.device?.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold">
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
