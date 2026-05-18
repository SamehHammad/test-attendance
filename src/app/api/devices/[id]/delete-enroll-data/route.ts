import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, fingerIndex } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.deleteEnrollData(device.ip, device.port, userId, fingerIndex || 0);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "تم حذف بيانات التسجيل بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error deleting enroll data:", error);
    return NextResponse.json({ success: false, error: "فشل في حذف بيانات التسجيل" }, { status: 500 });
  }
}
