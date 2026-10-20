import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trivvo Hr Device Gateway",
  description: "خادم وسيط لتنفيذ عمليات أجهزة ZKTeco مباشرة دون تخزين محلي",
  keywords: ["ZKTeco", "API", "attendance", "device gateway"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
