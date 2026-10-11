import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiFail } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const isActiveParam = searchParams.get("isActive");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { ip: { contains: search } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true" || isActiveParam === "1";
    }

    // Optional pagination: if page or limit is provided, paginate; else return all array for frontend compatibility
    const shouldPaginate = pageParam !== null || limitParam !== null;

    if (shouldPaginate) {
      const page = Math.max(1, parseInt(pageParam ?? "1"));
      const limit = Math.min(200, Math.max(1, parseInt(limitParam ?? "20")));
      const skip = (page - 1) * limit;

      const [devices, total] = await Promise.all([
        prisma.device.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                employees: true,
                attendance: true,
              },
            },
          },
        }),
        prisma.device.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: devices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Default: Fast list of all devices
    const devices = await prisma.device.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            employees: true,
            attendance: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: devices });
  } catch (error) {
    console.error("GET /api/devices error:", error);
    return apiFail(error, "فشل جلب الأجهزة");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, ip, port, location } = body;

    if (!name || !ip || !port) {
      return NextResponse.json(
        { success: false, error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    const existing = await prisma.device.findFirst({ where: { ip } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "جهاز بهذا الـ IP موجود بالفعل" },
        { status: 409 }
      );
    }

    const device = await prisma.device.create({
      data: { name, ip, port: Number(port), location },
    });
    return NextResponse.json({ success: true, data: device }, { status: 201 });
  } catch (error) {
    console.error("POST /api/devices error:", error);
    return apiFail(error, "فشل إنشاء الجهاز");
  }
}
