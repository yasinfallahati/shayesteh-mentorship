import Link from "next/link";
import { approvePayment, rejectPayment } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge, type Tone } from "@/components/kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { faDate, faDateTime, toman } from "@/lib/format";
import { subscriptionState } from "@/lib/subscription";

interface Row {
  id: number;
  user_id: number;
  amount: number;
  tracking_code: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  created_at: number;
  period_ends_at: number | null;
  full_name: string;
  phone: string;
  subscription_ends_at: number | null;
}

const PHASE: Record<string, [string, Tone]> = {
  active: ["اشتراک فعال", "success"],
  grace: ["در مهلت", "warning"],
  blocked: ["پنل غیرفعال", "danger"],
};

export default async function PaymentsPage() {
  await requireAdmin();
  const rows = db()
    .prepare(
      `SELECT p.*, u.full_name, u.phone, u.subscription_ends_at FROM payments p JOIN users u ON u.id = p.user_id
       ORDER BY p.status = 'pending' DESC, p.id DESC LIMIT 200`,
    )
    .all() as Row[];
  const pending = rows.filter((row) => row.status === "pending");
  const history = rows.filter((row) => row.status !== "pending");

  return (
    <>
      <PageHeader title="واریزها" description="بعد از بررسی حساب بانکی، واریز را تایید کنید تا اشتراک هنرجو ۳۰ روز تمدید شود." />
      {pending.length === 0 ? (
        <EmptyState title="واریزی منتظر تایید نیست" />
      ) : (
        <ul className="grid gap-3">
          {pending.map((row) => {
            const phase = PHASE[subscriptionState(row.subscription_ends_at, Date.now()).phase];
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/students/${row.user_id}`} className="font-semibold underline-offset-4 hover:underline">{row.full_name}</Link>
                    <StatusBadge tone={phase[1]}>{phase[0]}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xl font-bold">{toman(row.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {faDateTime(row.created_at)}
                    {row.tracking_code && <>، شماره پیگیری: <span dir="ltr">{row.tracking_code}</span></>}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <ActionForm action={rejectPayment} className="flex flex-wrap items-start gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <Input name="admin_note" placeholder="دلیل رد (اختیاری)" aria-label="دلیل رد" className="w-44" />
                    <SubmitButton variant="outline">رد واریز</SubmitButton>
                  </ActionForm>
                  <ActionForm action={approvePayment} className="grid gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton>تایید واریز</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>سابقه</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>هنرجو</TableHead><TableHead>مبلغ</TableHead><TableHead>تاریخ</TableHead><TableHead>وضعیت</TableHead><TableHead>اعتبار تا</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Link href={`/admin/students/${row.user_id}`} className="underline-offset-4 hover:underline">{row.full_name}</Link></TableCell>
                    <TableCell>{toman(row.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{faDateTime(row.created_at)}</TableCell>
                    <TableCell><StatusBadge tone={row.status === "approved" ? "success" : "danger"}>{row.status === "approved" ? "تایید شد" : "رد شد"}</StatusBadge></TableCell>
                    <TableCell className="text-muted-foreground">{row.period_ends_at ? faDate(row.period_ends_at) : row.admin_note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
