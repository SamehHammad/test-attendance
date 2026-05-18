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

    const result = await zkService.getUserInfo(device.ip, device.port, userId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        user: result.user 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error getting user info:", error);
    return NextResponse.json({ success: false, error: "فشل في جلب معلومات المستخدم" }, { status: 500 });
  }
}
