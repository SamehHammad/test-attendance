import { NextResponse } from "next/server";
import { getDbErrorMessage } from "@/lib/db-errors";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiFail(error: unknown, fallback: string, status = 500) {
  return NextResponse.json(
    { success: false, error: getDbErrorMessage(error, fallback) },
    { status }
  );
}
