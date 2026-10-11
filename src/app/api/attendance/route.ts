import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const deviceUserId = searchParams.get("deviceUserId") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (deviceUserId) {
      where.deviceUserId = deviceUserId;
    }

    if (type !== null && type !== undefined && type !== "") {
      where.type = parseInt(type);
    }

    if (startDate || endDate) {
      where.recordTime = {};
      if (startDate) {
        where.recordTime.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length === 10) {
          // Date string without time: set to end of day
          end.setHours(23, 59, 59, 999);
        }
        where.recordTime.lte = end;
      }
    }

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy: { recordTime: "desc" },
        skip,
        take: limit,
        include: {
          device: { select: { name: true, ip: true, location: true } },
          employee: { select: { id: true, name: true } },
        },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Attendance API Error]", error);
    return NextResponse.json(
      { success: false, error: "فشل جلب السجلات: " + (error?.message || "خطأ غير معروف") },
      { status: 500 }
    );
  }
}
