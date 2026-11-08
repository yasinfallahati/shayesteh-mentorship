import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <PageHeader title="تصحیح آزمون‌های عملی" description="بخش تستی خودکار تصحیح می‌شود. نمره بخش عملی را شما ثبت می‌کنید." />
      {rows.length === 0 ? (
        <EmptyState title="آزمونی منتظر تصحیح نیست" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead className="ps-4">هنرجو</TableHead><TableHead>آزمون</TableHead><TableHead>زمان ثبت</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="ps-4 font-medium"><Link href={`/admin/reviews/${row.id}`} className="underline-offset-4 hover:underline">{row.full_name}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{row.course_title}</TableCell>
                  <TableCell className="text-muted-foreground">{faDateTime(row.submitted_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
