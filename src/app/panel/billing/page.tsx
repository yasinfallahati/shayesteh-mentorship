import { LockIcon } from "lucide-react";
import { declarePayment } from "@/app/actions/student";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { Field, PageHeader, StatusBadge, type Tone } from "@/components/kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStudent } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { fa, faDate, faDateTime, formatCard, toman } from "@/lib/format";
import { subscriptionState } from "@/lib/subscription";

const STATUS: Record<string, [Tone, string]> = {
  pending: ["warning", "در انتظار تایید"],
  approved: ["success", "تایید شد"],
  rejected: ["danger", "رد شد"],
};

export default async function BillingPage() {
  const user = await requireStudent();
  const settings = getSettings();
  const state = subscriptionState(user.subscription_ends_at, Date.now());
  const payments = db()
    .prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 24")
    .all(user.id) as {
    id: number;
    amount: number;
    status: string;
    admin_note: string;
    created_at: number;
    period_ends_at: number | null;
  }[];
  const pending = payments.find((payment) => payment.status === "pending");
  const lastRejected = payments[0]?.status === "rejected" ? payments[0] : null;
  const price = Number(settings.monthly_price);

  return (
    <>
      <PageHeader title="اشتراک" />

      {state.phase === "blocked" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-pine p-5 text-white" role="alert">
          <LockIcon className="mt-1 size-5 shrink-0 text-grass-2" aria-hidden="true" />
          <div>
            <p className="font-bold">پنل شما غیرفعال شده است</p>
            <p className="text-sm text-[#d3e6dd]">
              مهلت تمدید اشتراک تمام شده. شهریه را واریز کنید و دکمه «واریز کردم» را بزنید. پنل بعد از تایید واریز دوباره باز می‌شود.
              پیشرفت و سابقه شما محفوظ است.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader><CardTitle>وضعیت اشتراک</CardTitle></CardHeader>
          <CardContent>
            {state.phase === "active" && <p className="text-3xl font-bold text-success">{fa(state.daysLeft)} روز مانده</p>}
            {state.phase === "grace" && <p className="text-3xl font-bold text-warning">{fa(state.graceDaysLeft)} روز مهلت تمدید</p>}
            {state.phase === "blocked" && <p className="text-3xl font-bold text-danger">غیرفعال</p>}
            {user.subscription_ends_at && <p className="mt-1 text-sm text-muted-foreground">پایان اشتراک: {faDate(user.subscription_ends_at)}</p>}
            <dl className="mt-5 border-t pt-4">
              <dt className="text-sm text-muted-foreground">شهریه هر ماه</dt>
              <dd className="text-xl font-bold">{toman(price)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>واریز به کارت</CardTitle></CardHeader>
          <CardContent>
            {!settings.card_number ? (
              <p className="text-sm text-muted-foreground">
                شماره کارت هنوز ثبت نشده است.{settings.support_phone && ` برای پرداخت با ${settings.support_phone} تماس بگیرید.`}
              </p>
            ) : (
              <>
                {settings.card_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/api/media/card" alt="تصویر کارت بانکی" className="mb-3 max-h-56 w-full rounded-lg object-contain" />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4">
                  <div>
                    <p className="text-xl font-semibold tracking-wider" dir="ltr">{formatCard(settings.card_number)}</p>
                    {(settings.card_holder || settings.card_bank) && (
                      <p className="text-sm text-muted-foreground">{[settings.card_holder, settings.card_bank].filter(Boolean).join("، ")}</p>
                    )}
                  </div>
                  <CopyButton value={settings.card_number.replace(/\D/g, "")} label="کپی شماره کارت" variant="default" />
                </div>

                {pending ? (
                  <p className="mt-4 rounded-lg bg-warning-soft p-3 text-sm font-medium text-warning" role="status">
                    اعلام واریز شما ثبت شده و منتظر تایید است.
                  </p>
                ) : (
                  <ActionForm action={declarePayment} className="mt-4 grid gap-3">
                    {lastRejected && (
                      <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
                        واریز قبلی شما رد شد{lastRejected.admin_note ? `: ${lastRejected.admin_note}` : "."}
                      </p>
                    )}
                    <Field id="tracking_code" label="شماره پیگیری (اختیاری)">
                      <Input id="tracking_code" name="tracking_code" dir="ltr" inputMode="numeric" maxLength={40} className="text-left" />
                    </Field>
                    <SubmitButton size="lg" className="w-full" pendingLabel="در حال ثبت…">{toman(price)} را واریز کردم</SubmitButton>
                  </ActionForm>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>سابقه پرداخت</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>تاریخ</TableHead><TableHead>مبلغ</TableHead><TableHead>وضعیت</TableHead><TableHead>اعتبار تا</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{faDateTime(payment.created_at)}</TableCell>
                    <TableCell>{toman(payment.amount)}</TableCell>
                    <TableCell><StatusBadge tone={STATUS[payment.status][0]}>{STATUS[payment.status][1]}</StatusBadge></TableCell>
                    <TableCell>{payment.period_ends_at ? faDate(payment.period_ends_at) : ""}</TableCell>
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
