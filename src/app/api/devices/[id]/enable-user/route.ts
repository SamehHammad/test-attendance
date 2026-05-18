import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, enabled } = await request.json();

    if (!userId || typeof enabled !== "boolean") {
      return NextResponse.json({ success: false, error: "معرف المستخدم وحالة التفعيل مطلوبان" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.enableUser(device.ip, device.port, userId, enabled);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: enabled ? "تم تفعيل المستخدم بنجاح" : "تم تعطيل المستخدم بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error enabling/disabling user:", error);
    return NextResponse.json({ success: false, error: "فشل في تفعيل/تعطيل المستخدم" }, { status: 500 });
  }
}
