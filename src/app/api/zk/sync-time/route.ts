import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, body, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const targetTime = body.time ? new Date(body.time) : new Date();
    const result = await zkService.setTime(device.ip, device.port, targetTime);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل ضبط توقيت الجهاز" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم ضبط توقيت الجهاز بنجاح",
      device: { ip: device.ip, port: device.port },
      syncedTime: targetTime.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل ضبط وقت الجهاز" },
      { status: 500 }
    );
  }
}
