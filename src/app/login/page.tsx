import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/public";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "ورود هنرجو | منتورشیپ شایسته" };

export default async function LoginPage() {
  const user = await currentUser();
  if (user?.role === "student") redirect("/panel");

  return (
    <main className="grid min-h-svh place-items-center bg-[linear-gradient(180deg,#9fd3ff_0%,#e6f4ff_100%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center"><Logo /></div>
        <div className="sheet p-6 sm:p-8">
          <h1 className="display text-3xl text-marine">ورود به پنل</h1>
          <p className="mb-5 mt-1 text-sm text-ink-soft">نام کاربری و رمزی را که بعد از تایید ثبت‌نام گرفته‌اید وارد کنید.</p>
          <ActionForm action={login}>
            <div>
              <label className="field-label" htmlFor="username">نام کاربری</label>
              <input id="username" name="username" required dir="ltr" autoComplete="username" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="password">رمز عبور</label>
              <input id="password" name="password" type="password" required dir="ltr" autoComplete="current-password" className="input" />
            </div>
            <SubmitButton className="btn btn-primary w-full" pendingLabel="در حال ورود…">ورود به پنل</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-5 text-center text-sm text-ink">
          هنوز ثبت‌نام نکرده‌اید؟ <Link href="/#apply" className="font-bold underline">پیش‌ثبت‌نام</Link>
        </p>
      </div>
    </main>
  );
}
