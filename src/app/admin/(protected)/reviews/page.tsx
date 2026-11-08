import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { faDateTime } from "@/lib/format";

export default async function ReviewsPage() {
  await requireAdmin();
  const rows = db()
    .prepare(
      `SELECT a.id, a.submitted_at, u.full_name, c.title AS course_title
       FROM attempts a JOIN users u ON u.id = a.user_id JOIN exams e ON e.id = a.exam_id JOIN courses c ON c.id = e.course_id
       WHERE a.status = 'pending_review' ORDER BY a.submitted_at`,
    )
    .all() as { id: number; submitted_at: number; full_name: string; course_title: string }[];
  return (
    <>
      <PageTitle title="تصحیح آزمون‌های عملی" hint="بخش تستی خودکار تصحیح می‌شود. نمره بخش عملی را شما ثبت می‌کنید." />
      {rows.length === 0 ? (
        <EmptyState title="آزمونی منتظر تصحیح نیست" />
      ) : (
        <ul className="sheet divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/reviews/${row.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-mist">
                <span className="font-bold">{row.full_name}</span>
                <span className="flex items-center gap-3 text-sm text-ink-soft">
                  <span className="badge badge-quiet">{row.course_title}</span>
                  {faDateTime(row.submitted_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
