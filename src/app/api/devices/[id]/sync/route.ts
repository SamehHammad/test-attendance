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

    // Fetch attendance from device
    const result = await zkService.getAttendance(device.ip, device.port);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // Upsert records
    let inserted = 0;
    for (const rec of result.data) {
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
      message: `تم مزامنة ${inserted} سجل جديد من أصل ${result.data.length} سجل`,
      total: result.data.length,
      inserted,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "فشل مزامنة البيانات" }, { status: 500 });
  }
}
