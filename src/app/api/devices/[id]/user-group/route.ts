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
    const userSn = parseInt(searchParams.get("userSn") || "0");

    if (!userSn) {
      return NextResponse.json({ success: false, error: "رقم المستخدم التسلسلي مطلوب" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.getUserGroup(device.ip, device.port, userSn);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        group: result.group 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error getting user group:", error);
    return NextResponse.json({ success: false, error: "فشل في جلب مجموعة المستخدم" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userSn, groupNumber } = await request.json();

    if (!userSn || !groupNumber) {
      return NextResponse.json({ success: false, error: "رقم المستخدم التسلسلي ورقم المجموعة مطلوبان" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.setUserGroup(device.ip, device.port, userSn, groupNumber);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "تم تعيين مجموعة المستخدم بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error setting user group:", error);
    return NextResponse.json({ success: false, error: "فشل في تعيين مجموعة المستخدم" }, { status: 500 });
  }
}
