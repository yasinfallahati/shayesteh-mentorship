import { declarePayment } from "@/app/actions/student";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { LockIcon, PageTitle } from "@/components/ui";
import { requireStudent } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { fa, faDate, faDateTime, formatCard, toman } from "@/lib/format";
import { subscriptionState } from "@/lib/subscription";

const STATUS = {
  pending: ["badge-sun", "در انتظار تایید"],
  approved: ["badge-grass", "تایید شد"],
  rejected: ["badge-ember", "رد شد"],
} as const;

export default async function BillingPage() {
  const user = await requireStudent();
  const settings = getSettings();
  const state = subscriptionState(user.subscription_ends_at, Date.now());
  const payments = db()
    .prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 24")
    .all(user.id) as {
    id: number;
    amount: number;
    status: keyof typeof STATUS;
    admin_note: string;
    created_at: number;
    period_ends_at: number | null;
  }[];
  const pending = payments.find((payment) => payment.status === "pending");
  const lastRejected = payments[0]?.status === "rejected" ? payments[0] : null;
  const price = Number(settings.monthly_price);

  return (
    <>
      <PageTitle title="اشتراک" />

      {state.phase === "blocked" && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-marine p-5 text-white" role="alert">
          <LockIcon className="mt-1 size-6 shrink-0 text-sun" />
          <div>
            <p className="display text-2xl">پنل شما غیرفعال شده است</p>
            <p className="text-sm text-[#c9dcec]">
              مهلت تمدید اشتراک تمام شده. شهریه را واریز کنید و دکمه «واریز کردم» را بزنید. پنل بعد از تایید واریز دوباره باز می‌شود.
              پیشرفت و سابقه شما محفوظ است.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="sheet p-6">
          <h2 className="font-bold">وضعیت اشتراک</h2>
          {state.phase === "active" && <p className="display mt-2 text-4xl text-grass-4">{fa(state.daysLeft)} روز مانده</p>}
          {state.phase === "grace" && <p className="display mt-2 text-4xl text-sun-deep">{fa(state.graceDaysLeft)} روز مهلت تمدید</p>}
          {state.phase === "blocked" && <p className="display mt-2 text-4xl text-[#a32a1f]">غیرفعال</p>}
          {user.subscription_ends_at && (
            <p className="mt-1 text-sm text-ink-soft">پایان اشتراک: {faDate(user.subscription_ends_at)}</p>
          )}
          <dl className="mt-5 border-t border-line pt-4">
            <dt className="text-sm text-ink-soft">شهریه هر ماه</dt>
            <dd className="display text-3xl text-marine">{toman(price)}</dd>
          </dl>
        </section>

        <section className="sheet p-6">
          <h2 className="font-bold">واریز به کارت</h2>
          {!settings.card_number ? (
            <p className="mt-2 text-sm text-ink-soft">
              شماره کارت هنوز ثبت نشده است.{settings.support_phone && ` برای پرداخت با ${settings.support_phone} تماس بگیرید.`}
            </p>
          ) : (
            <>
              {settings.card_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/api/media/card" alt="تصویر کارت بانکی" className="mt-3 max-h-56 w-full rounded-xl object-contain" />
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mist p-4">
                <div>
                  <p className="text-xl font-bold tracking-wider" dir="ltr">{formatCard(settings.card_number)}</p>
                  {(settings.card_holder || settings.card_bank) && (
                    <p className="text-sm text-ink-soft">{[settings.card_holder, settings.card_bank].filter(Boolean).join("، ")}</p>
                  )}
                </div>
                <CopyButton value={settings.card_number.replace(/\D/g, "")} label="کپی شماره کارت" className="btn btn-primary btn-sm" />
              </div>

              {pending ? (
                <p className="mt-4 rounded-xl bg-sun-soft p-3 text-sm font-medium text-sun-deep" role="status">
                  اعلام واریز شما ثبت شده و منتظر تایید است.
                </p>
              ) : (
                <ActionForm action={declarePayment} className="mt-4 space-y-3">
                  {lastRejected && (
                    <p className="rounded-xl bg-ember-soft p-3 text-sm text-[#a32a1f]">
                      واریز قبلی شما رد شد{lastRejected.admin_note ? `: ${lastRejected.admin_note}` : "."}
                    </p>
                  )}
                  <div>
                    <label className="field-label" htmlFor="tracking_code">شماره پیگیری (اختیاری)</label>
                    <input id="tracking_code" name="tracking_code" dir="ltr" inputMode="numeric" maxLength={40} className="input" />
                  </div>
                  <SubmitButton className="btn btn-grass w-full" pendingLabel="در حال ثبت…">
                    {toman(price)} را واریز کردم
                  </SubmitButton>
                </ActionForm>
              )}
            </>
          )}
        </section>
      </div>

      {payments.length > 0 && (
        <section className="sheet mt-5 overflow-x-auto p-6">
          <h2 className="mb-3 font-bold">سابقه پرداخت</h2>
          <table className="w-full min-w-md text-sm">
            <thead className="text-right text-ink-soft">
              <tr><th className="pb-2 font-medium">تاریخ</th><th className="pb-2 font-medium">مبلغ</th><th className="pb-2 font-medium">وضعیت</th><th className="pb-2 font-medium">اعتبار تا</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-2.5">{faDateTime(payment.created_at)}</td>
                  <td className="py-2.5">{toman(payment.amount)}</td>
                  <td className="py-2.5"><span className={`badge ${STATUS[payment.status][0]}`}>{STATUS[payment.status][1]}</span></td>
                  <td className="py-2.5">{payment.period_ends_at ? faDate(payment.period_ends_at) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
