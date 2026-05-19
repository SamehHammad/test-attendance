import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const clearDb = !!body.clearDb;

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.clearAttendance(device.ip, device.port);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    if (clearDb) {
      await prisma.attendanceRecord.deleteMany({
        where: { deviceId: id }
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تفريغ ذاكرة السجلات على الجهاز بنجاح" + (clearDb ? " وحذفها من قاعدة البيانات المحلية" : ""),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل تفريغ السجلات من الجهاز" }, { status: 500 });
  }
}
