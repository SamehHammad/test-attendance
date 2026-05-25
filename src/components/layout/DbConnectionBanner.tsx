"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function DbConnectionBanner() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [message, setMessage] = useState("");

  const check = () => {
    setStatus("checking");
    api
      .get("/api/health")
      .then(() => setStatus("ok"))
      .catch((err) => {
        setStatus("error");
        const data = err.response?.data as { error?: string } | undefined;
        setMessage(data?.error ?? "فشل الاتصال بقاعدة البيانات");
      });
  };

  useEffect(() => {
    check();
  }, []);

  if (status === "checking" || status === "ok") return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2">
      <span>{message}</span>
      <button
        type="button"
        onClick={check}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
