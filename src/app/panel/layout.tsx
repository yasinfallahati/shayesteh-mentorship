import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/public";
import { NavLinks, type NavItem } from "@/components/shell";
import { Logo } from "@/components/ui";
import { requireStudent } from "@/lib/auth";
import { fa, faDate } from "@/lib/format";
import { subscriptionState } from "@/lib/subscription";

export const metadata = { title: "پنل هنرجو | منتورشیپ شایسته" };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireStudent();
  const state = subscriptionState(user.subscription_ends_at, Date.now());
  const locked = state.phase === "blocked";
  const items: NavItem[] = [
    { href: "/panel", label: "داشبورد", icon: "home", exact: true, locked },
    { href: "/panel/path", label: "مسیر من", icon: "path", locked },
    { href: "/panel/billing", label: "اشتراک", icon: "card" },
    { href: "/panel/settings", label: "حساب من", icon: "gear" },
  ];

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="fixed inset-x-0 bottom-0 z-30 bg-marine lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:p-4">
        <div className="hidden px-2 pb-6 pt-2 lg:block"><Logo light href="/panel" /></div>
        <nav className="flex gap-1 p-1.5 lg:flex-col lg:p-0" aria-label="منوی پنل">
          <NavLinks items={items} />
        </nav>
        <div className="mt-auto hidden rounded-xl bg-marine-2 p-3 text-sm text-white lg:block">
          <p className="truncate font-semibold">{user.full_name}</p>
          <p className="truncate text-xs text-[#c9dcec]" dir="ltr">{user.username}</p>
          <form action={logout} className="mt-2">
            <button className="text-xs text-[#c9dcec] underline" type="submit">خروج از حساب</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="flex items-center justify-between bg-marine px-4 py-3 lg:hidden">
          <Logo light href="/panel" />
          <form action={logout}>
            <button className="text-sm text-[#c9dcec] underline" type="submit">خروج</button>
          </form>
        </header>

        {state.phase === "grace" && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-sun px-4 py-3 text-marine sm:px-8" role="status">
            <p className="font-semibold">
              اشتراک شما تمام شده است. {fa(state.graceDaysLeft)} روز دیگر فرصت تمدید دارید و بعد از آن پنل غیرفعال می‌شود
              {state.blocksAt ? ` (${faDate(state.blocksAt)}).` : "."}
            </p>
            <Link href="/panel/billing" className="btn btn-sm bg-marine text-white">تمدید اشتراک</Link>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
