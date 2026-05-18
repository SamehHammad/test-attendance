import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { timeout } = body;

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.disableDevice(device.ip, device.port, timeout);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: timeout ? `تم تعطيل الجهاز لمدة ${timeout} ثانية` : "تم تعطيل الجهاز بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error disabling device:", error);
    return NextResponse.json({ success: false, error: "فشل في تعطيل الجهاز" }, { status: 500 });
  }
}
