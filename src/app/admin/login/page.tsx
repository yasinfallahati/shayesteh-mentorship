import { redirect } from "next/navigation";
import { adminLogin } from "@/app/actions/public";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "ورود سوپرادمین | منتورشیپ شایسته", robots: { index: false } };

export default async function AdminLoginPage() {
  const user = await currentUser();
  if (user?.role === "admin") redirect("/admin");

  return (
    <main className="grid min-h-svh place-items-center bg-marine px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center"><Logo light /></div>
        <div className="sheet p-6 sm:p-8">
          <h1 className="display text-3xl text-marine">پنل سوپرادمین</h1>
          <ActionForm action={adminLogin} className="mt-5 space-y-4">
            <div>
              <label className="field-label" htmlFor="password">رمز سوپرادمین</label>
              <input id="password" name="password" type="password" required autoFocus dir="ltr" autoComplete="current-password" className="input" />
            </div>
            <SubmitButton className="btn btn-primary w-full" pendingLabel="در حال ورود…">ورود به پنل</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
