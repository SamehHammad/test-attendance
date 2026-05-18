import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    const result = await zkService.getUsers(device.ip, device.port);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    let inserted = 0;
    let updated = 0;
    
    for (const u of result.data) {
      const deviceUserId = String(u.userId);
      const existing = await prisma.employee.findUnique({
        where: {
          deviceUserId_deviceId: {
            deviceUserId,
            deviceId: id,
          },
        },
      });

      if (!existing) {
        await prisma.employee.create({
          data: {
            deviceUserId,
            name: u.name || `موظف ${deviceUserId}`,
            deviceId: id,
          },
        });
        inserted++;
      } else if (existing.name !== u.name) {
        await prisma.employee.update({
          where: { id: existing.id },
          data: { name: u.name || existing.name },
        });
        updated++;
      }
    }

    // Refresh device state
    await prisma.device.update({
      where: { id },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: `تم سحب الموظفين بنجاح: تم إضافة ${inserted} وتحديث ${updated} من أصل ${result.data.length} موظف`,
      total: result.data.length,
      inserted,
      updated,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل سحب بيانات الموظفين" }, { status: 500 });
  }
}
