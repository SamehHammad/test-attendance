import { NextResponse } from "next/server";
import { zkService } from "@/services/zk.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Filters & Performance optimization options
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const deviceUserIdParam = searchParams.get("deviceUserId") || searchParams.get("userId");
    const limitParam = searchParams.get("limit");
    const includeDataParam = searchParams.get("includeData"); // default false for blazing fast response
    const syncUsersParam = searchParams.get("syncUsers"); // default true

    const filterStartDate = startDateParam ? new Date(startDateParam) : null;
    const filterEndDate = endDateParam ? new Date(endDateParam) : null;
    if (filterEndDate && endDateParam && endDateParam.length === 10) {
      filterEndDate.setHours(23, 59, 59, 999);
    }
    const maxLimit = limitParam ? Math.max(1, parseInt(limitParam)) : null;
    const shouldSyncUsers = syncUsersParam !== "false" && syncUsersParam !== "0";
    const returnData = includeDataParam === "true" || includeDataParam === "1";

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ success: false, error: "الجهاز غير موجود" }, { status: 404 });
    }

    // Fetch biometric data from device
    const result = await zkService.getSyncData(device.ip, device.port);

    if (!result.success || !result.attendance) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل الاتصال بجهاز البصمة" },
        { status: 500 }
      );
    }

    console.log(`[Sync] Device ${device.name} (${device.ip}): Fetched ${result.attendance.length} records, ${result.users?.length ?? 0} users.`);

    // 1. Bulk handle Users (Employees)
    const existingEmployees = await prisma.employee.findMany({
      where: { deviceId: id },
      select: { id: true, deviceUserId: true, name: true },
    });

    const employeeMap = new Map<string, string>();
    const existingEmployeeNames = new Map<string, { id: string; name: string }>();

    for (const emp of existingEmployees) {
      employeeMap.set(emp.deviceUserId, emp.id);
      existingEmployeeNames.set(emp.deviceUserId, { id: emp.id, name: emp.name });
    }

    let employeesInserted = 0;
    if (shouldSyncUsers && result.users && result.users.length > 0) {
      const usersToInsert: { name: string; deviceUserId: string; deviceId: string }[] = [];
      const usersToUpdate: { id: string; name: string }[] = [];

      for (const u of result.users) {
        const uid = String(u.userId).trim();
        if (!uid) continue;

        const userName = u.name?.trim() || `مستخدم ${uid}`;
        const existing = existingEmployeeNames.get(uid);

        if (!existing) {
          usersToInsert.push({
            name: userName,
            deviceUserId: uid,
            deviceId: id,
          });
        } else if (existing.name !== userName) {
          usersToUpdate.push({
            id: existing.id,
            name: userName,
          });
        }
      }

      if (usersToInsert.length > 0) {
        await prisma.employee.createMany({
          data: usersToInsert,
          skipDuplicates: true,
        });
        employeesInserted = usersToInsert.length;

        // Re-query to populate employeeMap with new IDs
        const updatedEmployees = await prisma.employee.findMany({
          where: { deviceId: id },
          select: { id: true, deviceUserId: true },
        });
        for (const emp of updatedEmployees) {
          employeeMap.set(emp.deviceUserId, emp.id);
        }
      }

      if (usersToUpdate.length > 0) {
        await Promise.all(
          usersToUpdate.map((u) =>
            prisma.employee.update({ where: { id: u.id }, data: { name: u.name } })
          )
        );
      }
    }

    // 2. Filter & Bulk handle Attendance Records
    let filteredAttendance = result.attendance;

    // Apply user filters if provided
    if (deviceUserIdParam) {
      filteredAttendance = filteredAttendance.filter(
        (r) => String(r.deviceUserId).trim() === deviceUserIdParam.trim()
      );
    }
    if (filterStartDate) {
      filteredAttendance = filteredAttendance.filter(
        (r) => r.recordTime >= filterStartDate
      );
    }
    if (filterEndDate) {
      filteredAttendance = filteredAttendance.filter(
        (r) => r.recordTime <= filterEndDate
      );
    }
    if (maxLimit && maxLimit > 0) {
      filteredAttendance = filteredAttendance.slice(0, maxLimit);
    }

    // Load only existing attendance records that match the device to keep memory minimal
    const existingAttendance = await prisma.attendanceRecord.findMany({
      where: {
        deviceId: id,
        ...(filterStartDate || filterEndDate
          ? {
              recordTime: {
                ...(filterStartDate ? { gte: filterStartDate } : {}),
                ...(filterEndDate ? { lte: filterEndDate } : {}),
              },
            }
          : {}),
      },
      select: { id: true, deviceUserId: true, recordTime: true, type: true },
    });

    const existingMap = new Map<string, { id: string; type: number }>();
    for (const rec of existingAttendance) {
      const key = `${rec.deviceUserId}_${rec.recordTime.getTime()}`;
      existingMap.set(key, { id: rec.id, type: rec.type });
    }

    const recordsToInsert: {
      deviceUserId: string;
      recordTime: Date;
      type: number;
      deviceId: string;
      employeeId: string | null;
    }[] = [];

    const typeUpdates: { id: string; type: number }[] = [];
    const seenInBatch = new Set<string>();

    for (const rec of filteredAttendance) {
      const uid = String(rec.deviceUserId).trim();
      const timeMs = rec.recordTime.getTime();
      const key = `${uid}_${timeMs}`;

      if (seenInBatch.has(key)) {
        continue;
      }
      seenInBatch.add(key);

      const existing = existingMap.get(key);
      const recType = rec.type ?? 0;

      if (!existing) {
        recordsToInsert.push({
          deviceUserId: uid,
          recordTime: rec.recordTime,
          type: recType,
          deviceId: id,
          employeeId: employeeMap.get(uid) ?? null,
        });
      } else if (existing.type !== recType) {
        typeUpdates.push({ id: existing.id, type: recType });
      }
    }

    let inserted = 0;
    const BATCH_SIZE = 500;
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      const res = await prisma.attendanceRecord.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += res.count;
    }

    if (typeUpdates.length > 0) {
      const UPDATE_BATCH = 100;
      for (let i = 0; i < typeUpdates.length; i += UPDATE_BATCH) {
        const batch = typeUpdates.slice(i, i + UPDATE_BATCH);
        await prisma.$transaction(
          batch.map((item) =>
            prisma.attendanceRecord.update({
              where: { id: item.id },
              data: { type: item.type },
            })
          )
        );
      }
    }

    // 3. Update device sync status
    await prisma.device.update({
      where: { id },
      data: { lastSync: new Date(), isActive: true },
    });

    console.log(`[Sync] Finished: Inserted ${inserted} new records from ${filteredAttendance.length} records processed (Device total: ${result.attendance.length}).`);

    return NextResponse.json({
      success: true,
      message: `تمت المزامنة بنجاح: تم حفظ ${inserted} سجل جديد من أصل ${filteredAttendance.length} سجل تمت معالجتها`,
      totalDeviceRecords: result.attendance.length,
      processed: filteredAttendance.length,
      inserted,
      updated: typeUpdates.length,
      newEmployees: employeesInserted,
      // For peak network speed and minimal payload, only return heavy data array if explicitly requested
      data: returnData ? filteredAttendance : undefined,
      filtersApplied: {
        deviceUserId: deviceUserIdParam || null,
        startDate: startDateParam || null,
        endDate: endDateParam || null,
        limit: maxLimit,
      },
      debug: {
        info: result.info,
        usersCount: result.users?.length ?? 0,
      },
    });
  } catch (error: any) {
    console.error("[Sync Error]", error);
    return NextResponse.json(
      { success: false, error: "فشل مزامنة البيانات: " + (error?.message || "خطأ غير معروف") },
      { status: 500 }
    );
  }
}
