import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const skip = (page - 1) * limit;

    const where = deviceId ? { deviceId } : {};

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy: { recordTime: "desc" },
        skip,
        take: limit,
        include: {
          device: { select: { name: true, ip: true } },
          employee: { select: { name: true, department: true } },
        },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل جلب السجلات" }, { status: 500 });
  }
}
