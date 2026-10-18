import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { parseDeviceParams } from "@/lib/zk-direct";

export async function POST(req: Request) {
  try {
    const { device, body, error } = await parseDeviceParams(req);
    if (error || !device) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Filter params can come from JSON body or URL query
    const startDateParam = body.startDate || searchParams.get("startDate");
    const endDateParam = body.endDate || searchParams.get("endDate");
    const deviceUserIdParam = body.deviceUserId || body.userId || searchParams.get("deviceUserId") || searchParams.get("userId");
    const typeParam = body.type !== undefined ? body.type : searchParams.get("type");
    const pageParam = body.page || searchParams.get("page") || "1";
    const limitParam = body.limit || searchParams.get("limit");

    const filterStartDate = startDateParam ? new Date(startDateParam) : null;
    const filterEndDate = endDateParam ? new Date(endDateParam) : null;
    if (filterEndDate && endDateParam && String(endDateParam).length === 10) {
      filterEndDate.setHours(23, 59, 59, 999);
    }

    const result = await zkService.getAttendance(device.ip, device.port);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل قراءة حركات الحضور من الجهاز" },
        { status: 500 }
      );
    }

    let records = result.data;

    // 1. Filter by Date range
    if (filterStartDate) {
      records = records.filter((r) => new Date(r.timestamp || r.recordTime) >= filterStartDate);
    }
    if (filterEndDate) {
      records = records.filter((r) => new Date(r.timestamp || r.recordTime) <= filterEndDate);
    }

    // 2. Filter by User ID
    if (deviceUserIdParam) {
      const targetUid = String(deviceUserIdParam).trim();
      records = records.filter((r) => String(r.deviceUserId || r.employeeId).trim() === targetUid);
    }

    // 3. Filter by type (check-in / check-out)
    if (typeParam !== undefined && typeParam !== null && typeParam !== "") {
      const typeNum = parseInt(String(typeParam), 10);
      if (!isNaN(typeNum)) {
        records = records.filter((r) => r.type === typeNum || r.attendanceStateCode === typeNum);
      }
    }

    const totalCount = records.length;

    // 4. Pagination / Slicing
    const page = Math.max(1, parseInt(String(pageParam), 10));
    const limit = limitParam ? Math.max(1, parseInt(String(limitParam), 10)) : null;

    let paginatedRecords = records;
    if (limit) {
      const startIndex = (page - 1) * limit;
      paginatedRecords = records.slice(startIndex, startIndex + limit);
    }

    return NextResponse.json({
      success: true,
      device: { ip: device.ip, port: device.port },
      total: totalCount,
      count: paginatedRecords.length,
      page: limit ? page : 1,
      totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      records: paginatedRecords,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "حدث خطأ أثناء معالجة حركات الحضور" },
      { status: 500 }
    );
  }
}
