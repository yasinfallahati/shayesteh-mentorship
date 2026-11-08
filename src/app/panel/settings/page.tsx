import { changePassword, changeUsername } from "@/app/actions/student";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, PageHeader } from "@/components/kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireStudent } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireStudent();
  return (
    <>
      <PageHeader title="حساب من" description="نام کاربری و رمز عبورتان را از اینجا تغییر دهید." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader><CardTitle>تغییر نام کاربری</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={changeUsername}>
              <Field id="username" label="نام کاربری جدید">
                <Input id="username" name="username" required dir="ltr" defaultValue={user.username} autoComplete="username" className="text-left" />
              </Field>
              <Field id="password" label="رمز عبور فعلی">
                <Input id="password" name="password" type="password" required dir="ltr" autoComplete="current-password" className="text-left" />
              </Field>
              <SubmitButton className="justify-self-start">ذخیره نام کاربری</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>تغییر رمز عبور</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={changePassword} resetOnSuccess>
              <Field id="current_password" label="رمز عبور فعلی">
                <Input id="current_password" name="current_password" type="password" required dir="ltr" autoComplete="current-password" className="text-left" />
              </Field>
              <Field id="new_password" label="رمز عبور جدید" hint="دست‌کم ۸ کاراکتر">
                <Input id="new_password" name="new_password" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className="text-left" />
              </Field>
              <Field id="confirm_password" label="تکرار رمز عبور جدید">
                <Input id="confirm_password" name="confirm_password" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className="text-left" />
              </Field>
              <SubmitButton className="justify-self-start">ذخیره رمز عبور</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
