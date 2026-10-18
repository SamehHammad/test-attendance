import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, body, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const result = await zkService.getUsers(device.ip, device.port);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل قراءة قائمة الموظفين من الجهاز" },
        { status: 500 }
      );
    }

    const search = (body.search || new URL(req.url).searchParams.get("search") || "").trim().toLowerCase();
    let users = result.data;

    if (search) {
      users = users.filter((u: any) =>
        String(u.userId).toLowerCase().includes(search) ||
        String(u.name || "").toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      device: { ip: device.ip, port: device.port },
      total: users.length,
      users,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل جلب المستخدمين" },
      { status: 500 }
    );
  }
}
