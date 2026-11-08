import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, faDateTime } from "@/lib/format";

const STATUS_LABEL = { new: "جدید", contacted: "تماس گرفته شد", accepted: "پذیرفته شد", rejected: "رد شد" } as const;
type Status = keyof typeof STATUS_LABEL;

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const current: Status = status && status in STATUS_LABEL ? (status as Status) : "new";
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
      <PageHeader title="پیش‌ثبت‌نام‌ها" description="با متقاضی تماس بگیرید. اگر شرایط را پذیرفت، از صفحه درخواست برایش حساب بسازید." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as Status[]).map((key) => (
          <Button key={key} asChild size="sm" variant={key === current ? "default" : "outline"}>
            <Link href={`/admin/applications?status=${key}`}>{STATUS_LABEL[key]} ({fa(totals[key] ?? 0)})</Link>
          </Button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="درخواستی در این وضعیت نیست" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead className="ps-4">نام</TableHead><TableHead>موبایل</TableHead><TableHead>مسیر</TableHead><TableHead>سطح</TableHead><TableHead>تاریخ</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="ps-4 font-medium"><Link href={`/admin/applications/${row.id}`} className="underline-offset-4 hover:underline">{row.full_name}</Link></TableCell>
                  <TableCell><span dir="ltr">{row.phone}</span></TableCell>
                  <TableCell><StatusBadge tone="neutral">{row.track_title}</StatusBadge></TableCell>
                  <TableCell className="text-muted-foreground">{row.level}</TableCell>
                  <TableCell className="text-muted-foreground">{faDateTime(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
