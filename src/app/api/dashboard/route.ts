import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiFail } from "@/lib/api-response";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Parallelize all high-level counts and queries in a single Promise.all
    const [
      totalDevices,
      activeDevices,
      totalEmployees,
      totalAttendance,
      todayRecords,
      past7DaysRecords,
      recentRecords,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { isActive: true } }),
      prisma.employee.count(),
      prisma.attendanceRecord.count(),
      prisma.attendanceRecord.count({
        where: { recordTime: { gte: today } },
      }),
      // Single query for the entire 7-day range instead of 7 separate queries
      prisma.attendanceRecord.findMany({
        where: { recordTime: { gte: sevenDaysAgo } },
        select: { recordTime: true },
      }),
      prisma.attendanceRecord.findMany({
        orderBy: { recordTime: "desc" },
        take: 10,
        include: {
          device: { select: { name: true } },
          employee: { select: { name: true } },
        },
      }),
    ]);

    // Aggregate counts by day in memory (instant)
    const dayCounts = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dayCounts.set(key, 0);
    }

    for (const r of past7DaysRecords) {
      const rt = r.recordTime;
      const key = `${rt.getFullYear()}-${rt.getMonth() + 1}-${rt.getDate()}`;
      if (dayCounts.has(key)) {
        dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
      }
    }

    const chartData: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      chartData.push({
        date: d.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" }),
        count: dayCounts.get(key) || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: { totalDevices, activeDevices, totalEmployees, totalAttendance, todayRecords },
        chartData,
        recentRecords,
      },
    });
  } catch (error) {
    console.error("[Dashboard API Error]", error);
    return apiFail(error, "فشل جلب بيانات الداشبورد");
  }
}
