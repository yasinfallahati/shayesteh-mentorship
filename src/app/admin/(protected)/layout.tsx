import type { ReactNode } from "react";
import { logout } from "@/app/actions/public";
import { AppShell, type NavItem } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "سوپرادمین | منتورشیپ شایسته", robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const database = db();
  const count = (sql: string) => (database.prepare(sql).get() as { total: number }).total;
  const items: NavItem[] = [
    { href: "/admin", label: "نمای کلی", icon: "home", exact: true },
    { href: "/admin/applications", label: "پیش‌ثبت‌نام‌ها", icon: "inbox", count: count("SELECT COUNT(*) AS total FROM applications WHERE status = 'new'") },
    { href: "/admin/payments", label: "واریزها", icon: "card", count: count("SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'") },
    { href: "/admin/students", label: "وضعیت هنرجوها", icon: "people" },
    { href: "/admin/videos", label: "ویدیوها", icon: "video" },
    { href: "/admin/content", label: "زبان‌ها و مسیرها", icon: "path" },
    { href: "/admin/reviews", label: "تصحیح آزمون", icon: "check", count: count("SELECT COUNT(*) AS total FROM attempts WHERE status = 'pending_review'") },
    { href: "/admin/meetups", label: "جلسات حضوری", icon: "calendar" },
    { href: "/admin/settings", label: "تنظیمات", icon: "settings" },
  ];

  return (
    <AppShell home="/admin" items={items} userName="سوپرادمین" logout={logout}>
      {children}
    </AppShell>
  );
}
