import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader, StatusBadge, type Tone } from "@/components/kit";
import { requireAdmin, type User } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa } from "@/lib/format";
import { subscriptionState } from "@/lib/subscription";

export default async function AdminHomePage() {
  await requireAdmin();
  const database = db();
  const count = (sql: string) => (database.prepare(sql).get() as { total: number }).total;
  const students = database.prepare("SELECT subscription_ends_at FROM users WHERE role = 'student' AND is_active = 1").all() as Pick<User, "subscription_ends_at">[];
  const phases = { active: 0, grace: 0, blocked: 0 };
  for (const student of students) phases[subscriptionState(student.subscription_ends_at, Date.now()).phase] += 1;

  const todo = [
    { href: "/admin/applications", label: "پیش‌ثبت‌نام جدید", hint: "منتظر تماس شما", value: count("SELECT COUNT(*) AS total FROM applications WHERE status = 'new'") },
    { href: "/admin/payments", label: "واریز در انتظار تایید", hint: "هنرجو واریز را اعلام کرده", value: count("SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'") },
    { href: "/admin/reviews", label: "آزمون عملی برای تصحیح", hint: "منتظر نمره شما", value: count("SELECT COUNT(*) AS total FROM attempts WHERE status = 'pending_review'") },
  ];
  const status: { label: string; value: number; filter: string; tone: Tone }[] = [
    { label: "اشتراک فعال", value: phases.active, filter: "active", tone: "success" },
    { label: "در مهلت ۱۰ روزه", value: phases.grace, filter: "grace", tone: "warning" },
    { label: "پنل غیرفعال", value: phases.blocked, filter: "blocked", tone: "danger" },
  ];

  return (
    <>
      <PageHeader title="نمای کلی" />
      <h2 className="mb-3 text-base font-semibold">کارهای امروز</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {todo.map((item) => (
          <Link key={item.href} href={item.href} className={`group rounded-xl border p-5 transition-colors ${item.value ? "border-transparent bg-pine text-white hover:bg-pine-2" : "bg-card hover:bg-muted"}`}>
            <div className="flex items-start justify-between">
              <p className={`text-4xl font-bold ${item.value ? "text-grass-2" : "text-muted-foreground"}`}>{fa(item.value)}</p>
              <ChevronLeftIcon className="size-5 opacity-50 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            </div>
            <p className="mt-2 font-semibold">{item.label}</p>
            <p className={`text-sm ${item.value ? "text-[#d3e6dd]" : "text-muted-foreground"}`}>{item.hint}</p>
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-base font-semibold">وضعیت هنرجوها</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {status.map((item) => (
          <Link key={item.filter} href={`/admin/students?phase=${item.filter}`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted">
            <p className="text-3xl font-bold">{fa(item.value)}</p>
            <div className="mt-2"><StatusBadge tone={item.tone}>{item.label}</StatusBadge></div>
          </Link>
        ))}
      </div>
    </>
  );
}
