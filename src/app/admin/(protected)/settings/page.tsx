import { changeAdminPassword, removeCardImage, savePaymentSettings, uploadCardImage } from "@/app/actions/admin";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = getSettings();
  return (
    <>
      <PageTitle title="تنظیمات" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="sheet p-6">
          <h2 className="mb-4 font-bold">شهریه و شماره کارت</h2>
          <ActionForm action={savePaymentSettings}>
            <div>
              <label className="field-label" htmlFor="monthly_price">شهریه ماهانه (تومان)</label>
              <input id="monthly_price" name="monthly_price" required dir="ltr" inputMode="numeric" defaultValue={settings.monthly_price} className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="card_number">شماره کارت</label>
              <div className="flex gap-2">
                <input id="card_number" name="card_number" dir="ltr" inputMode="numeric" defaultValue={settings.card_number} className="input" />
                {settings.card_number && <CopyButton value={settings.card_number} className="btn btn-quiet" />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="card_holder">نام صاحب کارت</label>
                <input id="card_holder" name="card_holder" defaultValue={settings.card_holder} className="input" />
              </div>
              <div>
                <label className="field-label" htmlFor="card_bank">بانک</label>
                <input id="card_bank" name="card_bank" defaultValue={settings.card_bank} className="input" />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="support_phone">شماره پشتیبانی (اختیاری)</label>
              <input id="support_phone" name="support_phone" dir="ltr" defaultValue={settings.support_phone} className="input" />
            </div>
            <SubmitButton>ذخیره تنظیمات پرداخت</SubmitButton>
          </ActionForm>
        </section>

        <div className="space-y-5">
          <section className="sheet p-6">
            <h2 className="mb-4 font-bold">تصویر کارت بانکی</h2>
            {settings.card_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/card?v=${settings.card_image}`} alt="تصویر فعلی کارت" className="mb-4 max-h-52 rounded-xl" />
            )}
            <ActionForm action={uploadCardImage} resetOnSuccess>
              <div>
                <label className="field-label" htmlFor="image">انتخاب تصویر (JPG، PNG یا WEBP تا ۵ مگابایت)</label>
                <input id="image" name="image" type="file" required accept="image/jpeg,image/png,image/webp" className="input py-2.5 text-sm" />
              </div>
              <SubmitButton pendingLabel="در حال آپلود…">آپلود تصویر کارت</SubmitButton>
            </ActionForm>
            {settings.card_image && (
              <ActionForm action={removeCardImage} className="mt-3" confirm="تصویر کارت حذف شود؟">
                <SubmitButton className="btn btn-danger btn-sm">حذف تصویر</SubmitButton>
              </ActionForm>
            )}
          </section>

          <section className="sheet p-6">
            <h2 className="mb-4 font-bold">رمز سوپرادمین</h2>
            <ActionForm action={changeAdminPassword} resetOnSuccess>
              <div>
                <label className="field-label" htmlFor="current_password">رمز فعلی</label>
                <input id="current_password" name="current_password" type="password" required dir="ltr" autoComplete="current-password" className="input" />
              </div>
              <div>
                <label className="field-label" htmlFor="new_password">رمز جدید (دست‌کم ۱۲ کاراکتر)</label>
                <input id="new_password" name="new_password" type="password" required minLength={12} dir="ltr" autoComplete="new-password" className="input" />
              </div>
              <SubmitButton>تغییر رمز سوپرادمین</SubmitButton>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
