import { changeAdminPassword, removeCardImage, savePaymentSettings, uploadCardImage } from "@/app/actions/admin";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { Field, PageHeader } from "@/components/kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = getSettings();
  return (
    <>
      <PageHeader title="تنظیمات" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader><CardTitle>شهریه و شماره کارت</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={savePaymentSettings}>
              <Field id="monthly_price" label="شهریه ماهانه (تومان)">
                <Input id="monthly_price" name="monthly_price" required dir="ltr" inputMode="numeric" defaultValue={settings.monthly_price} className="text-left" />
              </Field>
              <Field id="card_number" label="شماره کارت">
                <div className="flex gap-2">
                  <Input id="card_number" name="card_number" dir="ltr" inputMode="numeric" defaultValue={settings.card_number} className="text-left" />
                  {settings.card_number && <CopyButton value={settings.card_number} size="default" />}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="card_holder" label="نام صاحب کارت"><Input id="card_holder" name="card_holder" defaultValue={settings.card_holder} /></Field>
                <Field id="card_bank" label="بانک"><Input id="card_bank" name="card_bank" defaultValue={settings.card_bank} /></Field>
              </div>
              <Field id="support_phone" label="شماره پشتیبانی (اختیاری)">
                <Input id="support_phone" name="support_phone" dir="ltr" defaultValue={settings.support_phone} className="text-left" />
              </Field>
              <SubmitButton className="justify-self-start">ذخیره تنظیمات پرداخت</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle>تصویر کارت بانکی</CardTitle></CardHeader>
            <CardContent>
              {settings.card_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/card?v=${settings.card_image}`} alt="تصویر فعلی کارت" className="mb-4 max-h-52 rounded-lg" />
              )}
              <ActionForm action={uploadCardImage} resetOnSuccess>
                <Field id="image" label="انتخاب تصویر" hint="JPG، PNG یا WEBP تا ۵ مگابایت">
                  <Input id="image" name="image" type="file" required accept="image/jpeg,image/png,image/webp" />
                </Field>
                <SubmitButton className="justify-self-start" pendingLabel="در حال آپلود…">آپلود تصویر کارت</SubmitButton>
              </ActionForm>
              {settings.card_image && (
                <ActionForm action={removeCardImage} className="mt-2" confirm="تصویر کارت حذف شود؟">
                  <SubmitButton variant="ghost" size="sm" className="text-destructive hover:text-destructive">حذف تصویر</SubmitButton>
                </ActionForm>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>رمز سوپرادمین</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={changeAdminPassword} resetOnSuccess>
                <Field id="current_password" label="رمز فعلی">
                  <Input id="current_password" name="current_password" type="password" required dir="ltr" autoComplete="current-password" className="text-left" />
                </Field>
                <Field id="new_password" label="رمز جدید" hint="دست‌کم ۱۲ کاراکتر">
                  <Input id="new_password" name="new_password" type="password" required minLength={12} dir="ltr" autoComplete="new-password" className="text-left" />
                </Field>
                <SubmitButton className="justify-self-start">تغییر رمز سوپرادمین</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
