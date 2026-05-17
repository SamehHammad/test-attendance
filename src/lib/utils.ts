import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAttendanceTypeLabel(type: number): string {
  const types: Record<number, string> = {
    0: "حضور",
    1: "انصراف",
    2: "استراحة خارج",
    3: "استراحة عودة",
    4: "عمل إضافي دخول",
    5: "عمل إضافي خروج",
  };
  return types[type] ?? "غير معروف";
}

export function getAttendanceTypeBadgeColor(type: number): string {
  const colors: Record<number, string> = {
    0: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    1: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    3: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    4: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    5: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  };
  return colors[type] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
}
