import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device)
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });

    const result = await zkService.testConnection(device.ip, device.port);

    if (result.success) {
      await prisma.device.update({
        where: { id },
        data: { isActive: true, lastSync: new Date() },
      });
    } else {
      await prisma.device.update({ where: { id }, data: { isActive: false } });
    }

    return NextResponse.json({
      success: result.success,
      info: result.info,
      error: result.error,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل اختبار الاتصال" }, { status: 500 });
  }
}
