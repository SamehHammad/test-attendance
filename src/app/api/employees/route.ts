import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiFail } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") || undefined;
    const search = searchParams.get("search")?.trim();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where: any = {};
    if (deviceId) {
      where.deviceId = deviceId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { deviceUserId: { contains: search } },
      ];
    }

    const shouldPaginate = pageParam !== null || limitParam !== null;

    if (shouldPaginate) {
      const page = Math.max(1, parseInt(pageParam ?? "1"));
      const limit = Math.min(500, Math.max(1, parseInt(limitParam ?? "50")));
      const skip = (page - 1) * limit;

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            device: { select: { name: true, ip: true } },
            _count: { select: { attendance: true } },
          },
        }),
        prisma.employee.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: employees,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Default fast retrieval
    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        device: { select: { name: true, ip: true } },
        _count: { select: { attendance: true } },
      },
    });
    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    console.error(error);
    return apiFail(error, "فشل جلب الموظفين");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceUserId, name, deviceId, departmentId, positionId } = body;

    if (!deviceUserId || !name || !deviceId) {
      return NextResponse.json({ success: false, error: "البيانات المطلوبة ناقصة" }, { status: 400 });
    }

    const existing = await prisma.employee.findFirst({
      where: { deviceUserId, deviceId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "الموظف موجود بالفعل لهذا الجهاز" },
        { status: 409 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        deviceUserId,
        name,
        deviceId,
        ...(departmentId ? { departmentId } : {}),
        ...(positionId ? { positionId } : {}),
      },
    });
    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    console.error(error);
    return apiFail(error, "فشل إنشاء الموظف");
  }
}
