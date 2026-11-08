import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/ui";
import { requireAdmin, type User } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, faDate } from "@/lib/format";
import { getTrackProgress } from "@/lib/progress";
import { subscriptionState, type SubscriptionPhase } from "@/lib/subscription";

const PHASE_LABEL: Record<SubscriptionPhase, [string, string]> = {
  active: ["فعال", "badge-grass"],
  grace: ["در مهلت", "badge-sun"],
  blocked: ["پنل غیرفعال", "badge-ember"],
};

const FILTERS: [string, string][] = [["", "همه"], ["active", "فعال"], ["grace", "در مهلت"], ["blocked", "پنل غیرفعال"]];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ phase?: string; q?: string }> }) {
  await requireAdmin();
  const { phase = "", q = "" } = await searchParams;
  const now = Date.now();
  const search = `%${q.trim()}%`;
  const students = (
    db()
      .prepare(
        `SELECT u.*, t.title AS track_title FROM users u JOIN tracks t ON t.id = u.track_id
         WHERE u.role = 'student' AND (u.full_name LIKE ? OR u.phone LIKE ? OR u.username LIKE ?)
         ORDER BY u.created_at DESC LIMIT 500`,
      )
      .all(search, search, search) as (User & { track_title: string })[]
  )
    .map((student) => ({ ...student, state: subscriptionState(student.subscription_ends_at, now) }))
    .filter((student) => !phase || student.state.phase === phase);

  return (
    <>
      <PageTitle title="هنرجوها" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <Link key={value} href={`/admin/students${value ? `?phase=${value}` : ""}`} className={`btn btn-sm ${phase === value ? "bg-marine text-white" : "btn-quiet"}`}>
              {label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {phase && <input type="hidden" name="phase" value={phase} />}
          <input name="q" defaultValue={q} placeholder="نام، موبایل یا نام کاربری" aria-label="جست‌وجوی هنرجو" className="input min-h-9! w-56 py-1 text-sm" />
          <button className="btn btn-quiet btn-sm" type="submit">جست‌وجو</button>
        </form>
      </div>
      {students.length === 0 ? (
        <EmptyState title="هنرجویی پیدا نشد" hint="هنرجوها بعد از تایید پیش‌ثبت‌نام به این فهرست اضافه می‌شوند." />
      ) : (
        <ul className="sheet divide-y divide-line">
          {students.map((student) => (
            <li key={student.id}>
              <Link href={`/admin/students/${student.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 p-4 hover:bg-mist">
                <span>
                  <span className="font-bold">{student.full_name}</span>
                  <span className="ms-3 text-sm text-ink-soft" dir="ltr">{student.phone}</span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                  <span className="badge badge-quiet">{student.track_title}</span>
                  <span>٪{fa(getTrackProgress(student.id, student.track_id!).percent)} پیشرفت</span>
                  {student.subscription_ends_at && <span>تا {faDate(student.subscription_ends_at)}</span>}
                  {student.is_active ? (
                    <span className={`badge ${PHASE_LABEL[student.state.phase][1]}`}>{PHASE_LABEL[student.state.phase][0]}</span>
                  ) : (
                    <span className="badge badge-ember">حساب مسدود</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
