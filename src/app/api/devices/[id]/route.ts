import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true, attendance: true } },
      },
    });
    if (!device)
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    return NextResponse.json({ success: true, data: device });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل جلب الجهاز" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, ip, port, location, isActive } = body;
    const device = await prisma.device.update({
      where: { id },
      data: { name, ip, port: Number(port), location, isActive },
    });
    return NextResponse.json({ success: true, data: device });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل تحديث الجهاز" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.device.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف الجهاز بنجاح" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل حذف الجهاز" }, { status: 500 });
  }
}
