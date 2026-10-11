import { PrismaClient } from "@prisma/client";
import { applyDatabaseUrl } from "@/lib/env";

applyDatabaseUrl();

// Prevent unhandled rejection crashes from transient closed Neon PgBouncer connections
if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason: any) => {
    const msg = String(reason?.message || reason || "");
    if (
      msg.includes("PostgreSQL connection") ||
      msg.includes("kind: Closed") ||
      msg.includes("connection closed") ||
      msg.includes("ConnectionClosed")
    ) {
      console.warn("[Prisma Connection Notice] Remote database closed idle connection. Auto-reconnecting on next request.");
      return;
    }
    console.error("[Unhandled Rejection]", reason);
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

globalForPrisma.prisma = prisma;
