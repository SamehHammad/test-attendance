import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiFail } from "@/lib/api-response";

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
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
