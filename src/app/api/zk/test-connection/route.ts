import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const result = await zkService.testConnection(device.ip, device.port, device.timeout);

    return NextResponse.json({
      success: result.success,
      device: { ip: device.ip, port: device.port },
      info: result.info,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل اختبار الاتصال بالجهاز" },
      { status: 500 }
    );
  }
}
