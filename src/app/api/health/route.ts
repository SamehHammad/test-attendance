import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbErrorMessage } from "@/lib/db-errors";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "connected",
    });
  } catch (error) {
    console.error("GET /api/health error:", error);
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: getDbErrorMessage(error, "فشل الاتصال بقاعدة البيانات"),
      },
      { status: 503 }
    );
  }
}
