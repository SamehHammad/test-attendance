import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, body, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const timeout = body.timeout ? parseInt(String(body.timeout), 10) : undefined;
    const result = await zkService.disableDevice(device.ip, device.port, timeout);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل تعطيل الجهاز" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم تعطيل شاشة وأزرار الجهاز مؤقتاً بنجاح",
      device: { ip: device.ip, port: device.port },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل تعطيل الجهاز" },
      { status: 500 }
    );
  }
}
