import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const result = await zkService.getDeviceParameters(device.ip, device.port);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل قراءة مواصفات الجهاز" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      device: { ip: device.ip, port: device.port },
      parameters: result.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل قراءة معلومات الجهاز" },
      { status: 500 }
    );
  }
}
