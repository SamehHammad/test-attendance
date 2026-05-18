import { NextRequest, NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await request.json();

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.setUser(device.ip, device.port, user);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "تم تعيين معلومات المستخدم بنجاح" 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error setting user:", error);
    return NextResponse.json({ success: false, error: "فشل في تعيين معلومات المستخدم" }, { status: 500 });
  }
}
