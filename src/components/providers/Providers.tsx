"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "12px",
            fontSize: "14px",
            fontFamily: "inherit",
            direction: "rtl",
          },
          success: {
            style: {
              background: "#059669",
              color: "#fff",
            },
            iconTheme: { primary: "#fff", secondary: "#059669" },
          },
          error: {
            style: {
              background: "#e11d48",
              color: "#fff",
            },
            iconTheme: { primary: "#fff", secondary: "#e11d48" },
          },
        }}
      />
    </ThemeProvider>
  );
}
