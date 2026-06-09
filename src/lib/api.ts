import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  timeout: 30000,
});

export function getApiErrorMessage(error: unknown, fallback = "حدث خطأ ما"): string {
  if (error instanceof AxiosError) {
    const serverError = error.response?.data as { error?: string } | undefined;
    if (serverError?.error) return serverError.error;
    if (error.code === "ECONNABORTED") return "انتهت مهلة الاتصال بالخادم";
    if (!error.response) return "تعذر الاتصال بالخادم. تأكد أن التطبيق يعمل على المنفذ 3000";
  }
  return fallback;
}
