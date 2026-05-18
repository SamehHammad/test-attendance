import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const timezoneIndex = parseInt(searchParams.get("timezoneIndex") || "0");

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.getTimezoneInfo(device.ip, device.port, timezoneIndex);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        timezone: result.timezone 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error getting timezone info:", error);
    return NextResponse.json({ success: false, error: "فشل في جلب معلومات المنطقة الزمنية" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const timezone = await request.json();

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.setTimezoneInfo(device.ip, device.port, timezone);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "تم تعيين معلومات المنطقة الزمنية بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error setting timezone info:", error);
    return NextResponse.json({ success: false, error: "فشل في تعيين معلومات المنطقة الزمنية" }, { status: 500 });
  }
}
