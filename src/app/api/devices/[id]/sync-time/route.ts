import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.setTime(device.ip, device.port, new Date());
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم مزامنة وقت وتاريخ الجهاز مع الخادم بنجاح",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل مزامنة وقت الجهاز" }, { status: 500 });
  }
}
