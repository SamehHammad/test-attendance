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
    0: "bg-emerald-500 text-white shadow-sm",
    1: "bg-rose-500 text-white shadow-sm",
    2: "bg-amber-500 text-white shadow-sm",
    3: "bg-blue-500 text-white shadow-sm",
    4: "bg-purple-500 text-white shadow-sm",
    5: "bg-pink-500 text-white shadow-sm",
  };
  return colors[type] ?? "bg-gray-500 text-white shadow-sm";
}
