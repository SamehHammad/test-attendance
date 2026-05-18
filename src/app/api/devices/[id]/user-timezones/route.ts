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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.getUserTimezones(device.ip, device.port, userId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        timezones: result.timezones 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error getting user timezones:", error);
    return NextResponse.json({ success: false, error: "فشل في جلب مناطق المستخدم الزمنية" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, timezones } = await request.json();

    if (!userId || !Array.isArray(timezones)) {
      return NextResponse.json({ success: false, error: "معرف المستخدم وقائمة المناطق الزمنية مطلوبان" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.setUserTimezones(device.ip, device.port, userId, timezones);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "تم تعيين مناطق المستخدم الزمنية بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error setting user timezones:", error);
    return NextResponse.json({ success: false, error: "فشل في تعيين مناطق المستخدم الزمنية" }, { status: 500 });
  }
}
