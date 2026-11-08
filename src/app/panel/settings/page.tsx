import { changePassword, changeUsername } from "@/app/actions/student";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { requireStudent } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireStudent();
  return (
    <>
      <PageTitle title="حساب من" hint="نام کاربری و رمز عبورتان را از اینجا تغییر دهید." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="sheet p-6">
          <h2 className="mb-4 font-bold">تغییر نام کاربری</h2>
          <ActionForm action={changeUsername}>
            <div>
              <label className="field-label" htmlFor="username">نام کاربری جدید</label>
              <input id="username" name="username" required dir="ltr" defaultValue={user.username} autoComplete="username" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="password">رمز عبور فعلی</label>
              <input id="password" name="password" type="password" required dir="ltr" autoComplete="current-password" className="input" />
            </div>
            <SubmitButton>ذخیره نام کاربری</SubmitButton>
          </ActionForm>
        </section>
        <section className="sheet p-6">
          <h2 className="mb-4 font-bold">تغییر رمز عبور</h2>
          <ActionForm action={changePassword} resetOnSuccess>
            <div>
              <label className="field-label" htmlFor="current_password">رمز عبور فعلی</label>
              <input id="current_password" name="current_password" type="password" required dir="ltr" autoComplete="current-password" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="new_password">رمز عبور جدید</label>
              <input id="new_password" name="new_password" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="confirm_password">تکرار رمز عبور جدید</label>
              <input id="confirm_password" name="confirm_password" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className="input" />
            </div>
            <SubmitButton>ذخیره رمز عبور</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
