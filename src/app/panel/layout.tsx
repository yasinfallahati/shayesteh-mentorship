import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/public";
import { AppShell, type NavItem } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
    { href: "/panel/leaderboard", label: "جدول رقابت", icon: "trophy", locked },
    { href: "/panel/billing", label: "اشتراک", icon: "card" },
    { href: "/panel/settings", label: "حساب من", icon: "settings" },
  ];

  const banner =
    state.phase === "grace" ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/20 bg-warning-soft px-4 py-2.5 text-warning sm:px-6 lg:px-8" role="status">
        <p className="flex items-center gap-2 text-sm font-medium">
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          اشتراک شما تمام شده است. {fa(state.graceDaysLeft)} روز دیگر فرصت تمدید دارید و بعد از آن پنل غیرفعال می‌شود
          {state.blocksAt ? ` (${faDate(state.blocksAt)}).` : "."}
        </p>
        <Button asChild size="sm"><Link href="/panel/billing">تمدید اشتراک</Link></Button>
      </div>
    ) : undefined;

  return (
    <AppShell home="/panel" items={items} userName={user.full_name} userDetail={user.username} logout={logout} banner={banner}>
      {children}
    </AppShell>
  );
}
