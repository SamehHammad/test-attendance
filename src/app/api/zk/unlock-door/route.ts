import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const result = await zkService.unlockDoor(device.ip, device.port);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل فتح الباب" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم فتح الباب بنجاح",
      device: { ip: device.ip, port: device.port },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل فتح الباب" },
      { status: 500 }
    );
  }
}
