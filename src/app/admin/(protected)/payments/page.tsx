import Link from "next/link";
import { approvePayment, rejectPayment } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageTitle } from "@/components/ui";
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

const PHASE = { active: ["اشتراک فعال", "badge-grass"], grace: ["در مهلت", "badge-sun"], blocked: ["پنل غیرفعال", "badge-ember"] } as const;

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
      <PageTitle title="واریزها" hint="بعد از بررسی حساب بانکی، واریز را تایید کنید تا اشتراک هنرجو ۳۰ روز تمدید شود." />
      {pending.length === 0 ? (
        <EmptyState title="واریزی منتظر تایید نیست" />
      ) : (
        <ul className="space-y-3">
          {pending.map((row) => {
            const phase = PHASE[subscriptionState(row.subscription_ends_at, Date.now()).phase];
            return (
              <li key={row.id} className="sheet flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <Link href={`/admin/students/${row.user_id}`} className="font-bold underline">{row.full_name}</Link>
                  <span className={`badge ms-2 ${phase[1]}`}>{phase[0]}</span>
                  <p className="display mt-1 text-2xl text-marine">{toman(row.amount)}</p>
                  <p className="text-sm text-ink-soft">
                    {faDateTime(row.created_at)}
                    {row.tracking_code && <>، شماره پیگیری: <span dir="ltr">{row.tracking_code}</span></>}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <ActionForm action={rejectPayment} className="flex flex-wrap items-start gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input name="admin_note" placeholder="دلیل رد (اختیاری)" aria-label="دلیل رد" className="input min-h-9! w-44 py-1 text-sm" />
                    <SubmitButton className="btn btn-danger btn-sm">رد واریز</SubmitButton>
                  </ActionForm>
                  <ActionForm action={approvePayment} className="space-y-2">
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton className="btn btn-grass btn-sm">تایید واریز</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 && (
        <section className="sheet mt-6 overflow-x-auto p-5">
          <h2 className="mb-3 font-bold">سابقه</h2>
          <table className="w-full min-w-xl text-sm">
            <thead className="text-right text-ink-soft">
              <tr><th className="pb-2 font-medium">هنرجو</th><th className="pb-2 font-medium">مبلغ</th><th className="pb-2 font-medium">تاریخ</th><th className="pb-2 font-medium">وضعیت</th><th className="pb-2 font-medium">اعتبار تا</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5"><Link href={`/admin/students/${row.user_id}`} className="underline">{row.full_name}</Link></td>
                  <td className="py-2.5">{toman(row.amount)}</td>
                  <td className="py-2.5">{faDateTime(row.created_at)}</td>
                  <td className="py-2.5">
                    <span className={`badge ${row.status === "approved" ? "badge-grass" : "badge-ember"}`}>{row.status === "approved" ? "تایید شد" : "رد شد"}</span>
                  </td>
                  <td className="py-2.5">{row.period_ends_at ? faDate(row.period_ends_at) : row.admin_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
