"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const LINKS = [
  ["#mentorship", "منتورشیپ چیست"],
  ["#tracks", "مسیرها"],
  ["#journey", "روند ثبت‌نام"],
  ["#faq", "سوال‌ها"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex" aria-label="بخش‌های صفحه">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">ورود هنرجو</Link></Button>
          <Button asChild><a href="#apply">پیش‌ثبت‌نام</a></Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="باز کردن منو"><MenuIcon /></Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader><SheetTitle>منو</SheetTitle></SheetHeader>
              <nav className="grid gap-1 px-4" aria-label="منوی موبایل">
                {LINKS.map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 font-medium hover:bg-muted">{label}</a>
                ))}
                <Link href="/login" className="rounded-md px-3 py-2.5 font-medium hover:bg-muted">ورود هنرجو</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
