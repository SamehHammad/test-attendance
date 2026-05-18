import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device)
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });

    // Fetch all data in a single connection
    const result = await zkService.getSyncData(device.ip, device.port);

    if (!result.success || !result.attendance) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    console.log("============= بيانات البصمة القادمة من الجهاز =============");
    console.dir(result.attendance, { depth: null, colors: true });
    console.log(`إجمالي السجلات: ${result.attendance.length}`);
    console.log("==========================================================");

    // Upsert records
    let inserted = 0;
    for (const rec of result.attendance) {
      const existing = await prisma.attendanceRecord.findFirst({
        where: {
          deviceId: id,
          deviceUserId: rec.deviceUserId,
          recordTime: rec.recordTime,
        },
      });
      if (!existing) {
        // Try to find matching employee
        const employee = await prisma.employee.findFirst({
          where: { deviceUserId: rec.deviceUserId, deviceId: id },
        });
        await prisma.attendanceRecord.create({
          data: {
            deviceUserId: rec.deviceUserId,
            recordTime: rec.recordTime,
            type: rec.type,
            deviceId: id,
            employeeId: employee?.id ?? null,
          },
        });
        inserted++;
      }
    }

    // Update sync time
    await prisma.device.update({
      where: { id },
      data: { lastSync: new Date(), isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: `تم مزامنة ${inserted} سجل جديد من أصل ${result.attendance.length} سجل`,
      total: result.attendance.length,
      inserted,
      data: result.attendance,
      debug: {
        info: result.info,
        users: result.users,
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل مزامنة البيانات" }, { status: 500 });
  }
}
