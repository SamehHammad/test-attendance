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

    const result = await zkService.clearAttendance(device.ip, device.port);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // Also clear them in the DB if requested? Usually we only clear the device's logs
    // to free up memory on the hardware, keeping them in PostgreSQL DB.
    return NextResponse.json({
      success: true,
      message: "تم تفريغ ذاكرة السجلات على الجهاز بنجاح",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل تفريغ السجلات من الجهاز" }, { status: 500 });
  }
}
