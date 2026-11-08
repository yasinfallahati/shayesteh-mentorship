import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "منتورشیپ شایسته | آموزش برنامه‌نویسی کنار منتور",
  description:
    "منتورشیپ برنامه‌نویسی شرکت تجارت الکترونیک شایسته ایرانیان در مسیرهای هوش مصنوعی، فرانت‌اند، بک‌اند و دواپس.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
