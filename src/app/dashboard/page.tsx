"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Monitor, Users, ClipboardList, CheckCircle2 } from "lucide-react";
import axios from "axios";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/dashboard").then((res) => {
      setStats(res.data.data.stats);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الأجهزة"
          value={stats?.totalDevices || 0}
          icon={Monitor}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="الأجهزة النشطة"
          value={stats?.activeDevices || 0}
          icon={CheckCircle2}
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          title="إجمالي الموظفين"
          value={stats?.totalEmployees || 0}
          icon={Users}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard
          title="بصمات اليوم"
          value={stats?.todayRecords || 0}
          icon={ClipboardList}
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm mt-8">
        <h2 className="text-lg font-bold mb-4">أهلاً بك في نظام ZK Attendance</h2>
        <p className="text-gray-500">
          هذه لوحة القيادة الخاصة بنظام إدارة الحضور والانصراف. يمكنك من القائمة الجانبية:
        </p>
        <ul className="list-disc list-inside mt-4 text-gray-600 space-y-2">
          <li>إضافة وإدارة أجهزة البصمة.</li>
          <li>مزامنة وسحب بيانات الحضور الانصراف من الأجهزة عبر الشبكة المحلية (IP & Port).</li>
          <li>عرض الموظفين المسجلين على الأجهزة.</li>
          <li>استعراض سجلات الحضور.</li>
        </ul>
      </div>
    </div>
  );
}
