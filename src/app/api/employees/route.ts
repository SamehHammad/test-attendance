import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const where = deviceId ? { deviceId } : {};

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
    return NextResponse.json({ success: false, error: "فشل جلب الموظفين" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceUserId, name, department, position, deviceId } = body;

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
      data: { deviceUserId, name, department, position, deviceId },
    });
    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل إنشاء الموظف" }, { status: 500 });
  }
}
