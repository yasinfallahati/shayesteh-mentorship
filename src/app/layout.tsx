import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <body>
        <DirectionProvider dir="rtl">
          <TooltipProvider>
            {children}
            <Toaster theme="light" position="bottom-left" dir="rtl" />
          </TooltipProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
