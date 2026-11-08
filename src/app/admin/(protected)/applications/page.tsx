import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, faDateTime } from "@/lib/format";

const APPLICATION_STATUS = {
  new: ["جدید", "badge-azure"],
  contacted: ["تماس گرفته شد", "badge-sun"],
  accepted: ["پذیرفته شد", "badge-grass"],
  rejected: ["رد شد", "badge-ember"],
} as const;

type Status = keyof typeof APPLICATION_STATUS;

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const current: Status = status && status in APPLICATION_STATUS ? (status as Status) : "new";
  const database = db();
  const rows = database
    .prepare(
      `SELECT a.*, t.title AS track_title FROM applications a JOIN tracks t ON t.id = a.track_id
       WHERE a.status = ? ORDER BY a.created_at DESC LIMIT 200`,
    )
    .all(current) as { id: number; full_name: string; phone: string; track_title: string; level: string; created_at: number }[];
  const totals = Object.fromEntries(
    (database.prepare("SELECT status, COUNT(*) AS total FROM applications GROUP BY status").all() as { status: string; total: number }[]).map(
      (row) => [row.status, row.total],
    ),
  );

  return (
    <>
      <PageTitle title="پیش‌ثبت‌نام‌ها" hint="با متقاضی تماس بگیرید. اگر شرایط را پذیرفت، از صفحه درخواست برایش حساب بسازید." />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {(Object.keys(APPLICATION_STATUS) as Status[]).map((key) => (
          <Link
            key={key}
            href={`/admin/applications?status=${key}`}
            role="tab"
            aria-selected={key === current}
            className={`btn btn-sm ${key === current ? "bg-marine text-white" : "btn-quiet"}`}
          >
            {APPLICATION_STATUS[key][0]} ({fa(totals[key] ?? 0)})
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="درخواستی در این وضعیت نیست" />
      ) : (
        <ul className="sheet divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/applications/${row.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 p-4 hover:bg-mist">
                <span>
                  <span className="font-bold">{row.full_name}</span>
                  <span className="ms-3 text-sm text-ink-soft" dir="ltr">{row.phone}</span>
                </span>
                <span className="flex items-center gap-3 text-sm text-ink-soft">
                  <span className="badge badge-quiet">{row.track_title}</span>
                  <span>{row.level}</span>
                  <span>{faDateTime(row.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
