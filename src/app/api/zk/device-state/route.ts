import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const [stateResult, infoResult] = await Promise.all([
      zkService.getDeviceState(device.ip, device.port),
      zkService.testConnection(device.ip, device.port),
    ]);

    return NextResponse.json({
      success: stateResult.success || infoResult.success,
      device: { ip: device.ip, port: device.port },
      state: stateResult.state,
      info: infoResult.info,
      error: stateResult.error || infoResult.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل قراءة حالة الجهاز" },
      { status: 500 }
    );
  }
}
