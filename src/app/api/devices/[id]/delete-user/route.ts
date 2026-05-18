import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.deleteUser(device.ip, device.port, userId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "تم حذف المستخدم بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ success: false, error: "فشل في حذف المستخدم" }, { status: 500 });
  }
}
