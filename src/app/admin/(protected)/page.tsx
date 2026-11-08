import Link from "next/link";
import { PageTitle } from "@/components/ui";
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
  const status = [
    { label: "اشتراک فعال", value: phases.active, filter: "active" },
    { label: "در مهلت ۱۰ روزه", value: phases.grace, filter: "grace" },
    { label: "پنل غیرفعال", value: phases.blocked, filter: "blocked" },
  ];

  return (
    <>
      <PageTitle title="نمای کلی" />
      <h2 className="mb-3 font-bold">کارهای امروز</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {todo.map((item) => (
          <Link key={item.href} href={item.href} className={`rounded-2xl p-5 transition-colors ${item.value ? "bg-marine text-white hover:bg-marine-2" : "sheet"}`}>
            <p className={`display text-6xl ${item.value ? "text-sun" : "text-ink-soft"}`}>{fa(item.value)}</p>
            <p className="mt-1 font-bold">{item.label}</p>
            <p className={`text-sm ${item.value ? "text-[#c9dcec]" : "text-ink-soft"}`}>{item.hint}</p>
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-bold">وضعیت هنرجوها</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {status.map((item) => (
          <Link key={item.filter} href={`/admin/students?phase=${item.filter}`} className="sheet p-5 hover:border-ink-soft">
            <p className="display text-5xl text-marine">{fa(item.value)}</p>
            <p className="mt-1 font-medium text-ink-soft">{item.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
