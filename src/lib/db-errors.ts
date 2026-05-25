import { Prisma } from "@prisma/client";

export function getDbErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
        return "لا يمكن الاتصال بقاعدة البيانات. تحقق من الإنترنت وحاول مرة أخرى.";
      case "P1000":
        return "فشل تسجيل الدخول لقاعدة البيانات. تحقق من DATABASE_URL.";
      case "P1017":
        return "انقطع الاتصال بقاعدة البيانات. أعد المحاولة.";
      case "P2002":
        return "هذا السجل موجود مسبقاً.";
      case "P2021":
        return "جدول غير موجود في قاعدة البيانات. نفّذ: npx prisma db push";
      default:
        break;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "فشل تهيئة قاعدة البيانات. تحقق من DATABASE_URL والإنترنت.";
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("Can't reach database") ||
      msg.includes("connect") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ETIMEDOUT")
    ) {
      return "لا يمكن الاتصال بقاعدة البيانات. تحقق من الإنترنت.";
    }
  }

  return fallback;
}
