import type { ReactNode } from "react";
import { adminLogout } from "@/app/actions/public";
import { NavLinks, type NavItem } from "@/components/shell";
import { Logo } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "سوپرادمین | منتورشیپ شایسته", robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const database = db();
  const count = (sql: string) => (database.prepare(sql).get() as { total: number }).total;
  const items: NavItem[] = [
    { href: "/admin", label: "نمای کلی", icon: "home", exact: true },
    { href: "/admin/applications", label: "پیش‌ثبت‌نام", icon: "inbox", count: count("SELECT COUNT(*) AS total FROM applications WHERE status = 'new'") },
    { href: "/admin/payments", label: "واریزها", icon: "card", count: count("SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'") },
    { href: "/admin/students", label: "هنرجوها", icon: "people" },
    { href: "/admin/content", label: "محتوا و آزمون", icon: "video" },
    { href: "/admin/reviews", label: "تصحیح", icon: "check", count: count("SELECT COUNT(*) AS total FROM attempts WHERE status = 'pending_review'") },
    { href: "/admin/settings", label: "تنظیمات", icon: "gear" },
  ];

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="fixed inset-x-0 bottom-0 z-30 bg-marine lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:p-4">
        <div className="hidden px-2 pb-6 pt-2 lg:block"><Logo light href="/admin" /></div>
        <nav className="flex gap-1 overflow-x-auto p-1.5 lg:flex-col lg:overflow-visible lg:p-0" aria-label="منوی سوپرادمین">
          <NavLinks items={items} />
        </nav>
        <form action={adminLogout} className="mt-auto hidden p-3 lg:block">
          <button className="text-sm text-[#c9dcec] underline" type="submit">خروج از پنل</button>
        </form>
      </aside>
      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="flex items-center justify-between bg-marine px-4 py-3 lg:hidden">
          <Logo light href="/admin" />
          <form action={adminLogout}>
            <button className="text-sm text-[#c9dcec] underline" type="submit">خروج</button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
