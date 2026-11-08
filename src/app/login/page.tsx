import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/public";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Logo } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "ورود هنرجو | منتورشیپ شایسته" };

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/panel");

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center"><Logo /></div>
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <h1 className="text-xl">ورود به پنل</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">نام کاربری و رمزی را که بعد از تایید ثبت‌نام گرفته‌اید وارد کنید.</p>
          <ActionForm action={login}>
            <Field id="username" label="نام کاربری">
              <Input id="username" name="username" required dir="ltr" autoComplete="username" className="h-10 text-left" />
            </Field>
            <Field id="password" label="رمز عبور">
              <Input id="password" name="password" type="password" required dir="ltr" autoComplete="current-password" className="h-10 text-left" />
            </Field>
            <SubmitButton size="lg" className="h-10 w-full" pendingLabel="در حال ورود…">ورود به پنل</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          هنوز ثبت‌نام نکرده‌اید؟ <Link href="/#apply" className="font-semibold text-foreground underline underline-offset-4">پیش‌ثبت‌نام</Link>
        </p>
      </div>
    </main>
  );
}
