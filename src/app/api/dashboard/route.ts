import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalDevices, activeDevices, totalEmployees, totalAttendance] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { isActive: true } }),
      prisma.employee.count(),
      prisma.attendanceRecord.count(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = await prisma.attendanceRecord.count({
      where: { recordTime: { gte: today } },
    });

    // Last 7 days chart data
    const last7Days = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await prisma.attendanceRecord.count({
          where: { recordTime: { gte: date, lt: nextDate } },
        });
        return {
          date: date.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" }),
          count,
        };
      })
    );

    const recentRecords = await prisma.attendanceRecord.findMany({
      orderBy: { recordTime: "desc" },
      take: 10,
      include: {
        device: { select: { name: true } },
        employee: { select: { name: true, department: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: { totalDevices, activeDevices, totalEmployees, totalAttendance, todayRecords },
        chartData: last7Days.reverse(),
        recentRecords,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل جلب بيانات الداشبورد" }, { status: 500 });
  }
}
