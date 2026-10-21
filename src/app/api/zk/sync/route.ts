import { NextResponse } from "next/server";
import { parseDeviceParams } from "@/lib/zk-direct";
import { zkService } from "@/services/zk.service";

export async function POST(request: Request) {
  try {
    const { device, error } = await parseDeviceParams(request);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const result = await zkService.getSyncData(device.ip, device.port, device.timeout);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل قراءة بيانات الجهاز" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      device: { ip: device.ip, port: device.port },
      users: result.users ?? [],
      attendance: result.attendance ?? [],
      info: result.info ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ أثناء قراءة بيانات الجهاز",
      },
      { status: 500 },
    );
  }
}
