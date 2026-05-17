import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "ZK Attendance | نظام الحضور والانصراف",
  description: "نظام احترافي لإدارة الحضور والانصراف باستخدام أجهزة ZKTeco",
  keywords: ["ZKTeco", "حضور", "انصراف", "K40", "بصمة"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} font-cairo antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
