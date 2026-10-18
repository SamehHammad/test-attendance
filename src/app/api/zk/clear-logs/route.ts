import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const result = await zkService.clearAttendance(device.ip, device.port);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل مسح سجلات الحضور من الجهاز" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم مسح جميع سجلات الحضور من ذاكرة الجهاز بنجاح",
      device: { ip: device.ip, port: device.port },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل مسح سجلات الجهاز" },
      { status: 500 }
    );
  }
}
