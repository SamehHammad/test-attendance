import { NextResponse } from "next/server";

export interface ZKDirectDeviceInput {
  ip: string;
  port: number;
  inport?: number;
  timeout?: number;
}

export async function parseDeviceParams(req: Request): Promise<{ device?: ZKDirectDeviceInput; body: any; error?: string }> {
  try {
    let body: any = {};
    if (req.method !== "GET" && req.method !== "HEAD") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
        try {
          const formData = await req.formData();
          formData.forEach((value, key) => {
            body[key] = value;
          });
        } catch {
          body = {};
        }
      } else {
        try {
          body = await req.json();
        } catch {
          try {
            const formData = await req.formData();
            formData.forEach((value, key) => {
              body[key] = value;
            });
          } catch {
            body = {};
          }
        }
      }
    }

    const url = new URL(req.url);
    const ip = body.ip || body.device?.ip || url.searchParams.get("ip");
    const portRaw = body.port || body.device?.port || url.searchParams.get("port") || 4370;
    const inportRaw = body.inport || body.device?.inport || url.searchParams.get("inport") || 4000;
    const timeoutRaw = body.timeout || body.device?.timeout || url.searchParams.get("timeout") || 3000;

    if (!ip || typeof ip !== "string" || !ip.trim()) {
      return { body, error: "يرجى تحديد عنوان IP الخاص بالجهاز (ip)" };
    }

    const port = parseInt(String(portRaw), 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      return { body, error: "رقم المنفذ (port) غير صالح" };
    }

    return {
      device: {
        ip: ip.trim(),
        port,
        inport: parseInt(String(inportRaw), 10) || 4000,
        timeout: parseInt(String(timeoutRaw), 10) || 3000,
      },
      body,
    };
  } catch (err: any) {
    return { body: {}, error: err?.message || "خطأ في قراءة بيانات الطلب" };
  }
}
