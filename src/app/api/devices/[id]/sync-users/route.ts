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
      return NextResponse.json(
        { success: false, error: result.error || "فشل الاتصال بجهاز البصمة" },
        { status: 500 }
      );
    }

    // 1. Fetch all existing employees for this device in 1 query
    const existingEmployees = await prisma.employee.findMany({
      where: { deviceId: id },
      select: { id: true, deviceUserId: true, name: true },
    });

    const existingMap = new Map<string, { id: string; name: string }>();
    for (const emp of existingEmployees) {
      existingMap.set(emp.deviceUserId, { id: emp.id, name: emp.name });
    }

    const toInsert: { name: string; deviceUserId: string; deviceId: string }[] = [];
    const toUpdate: { id: string; name: string }[] = [];
    const seenUids = new Set<string>();

    for (const u of result.data) {
      const deviceUserId = String(u.userId).trim();
      if (!deviceUserId || seenUids.has(deviceUserId)) continue;
      seenUids.add(deviceUserId);

      const employeeName = u.name?.trim() || `موظف ${deviceUserId}`;
      const existing = existingMap.get(deviceUserId);

      if (!existing) {
        toInsert.push({
          deviceUserId,
          name: employeeName,
          deviceId: id,
        });
      } else if (existing.name !== employeeName) {
        toUpdate.push({
          id: existing.id,
          name: employeeName,
        });
      }
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const res = await prisma.employee.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
      inserted = res.count;
    }

    let updated = 0;
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((item) =>
          prisma.employee.update({
            where: { id: item.id },
            data: { name: item.name },
          })
        )
      );
      updated = toUpdate.length;
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
  } catch (error: any) {
    console.error("[Sync Users Error]", error);
    return NextResponse.json(
      { success: false, error: "فشل سحب بيانات الموظفين: " + (error?.message || "خطأ غير معروف") },
      { status: 500 }
    );
  }
}
