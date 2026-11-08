"use client";

import {
  CalendarDaysIcon,
  CheckSquareIcon,
  CreditCardIcon,
  HomeIcon,
  InboxIcon,
  LockIcon,
  LogOutIcon,
  RouteIcon,
  SettingsIcon,
  TrophyIcon,
  UsersIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/kit";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const ICONS: Record<string, LucideIcon> = {
  home: HomeIcon,
  path: RouteIcon,
  card: CreditCardIcon,
  settings: SettingsIcon,
  inbox: InboxIcon,
  people: UsersIcon,
  video: VideoIcon,
  check: CheckSquareIcon,
  trophy: TrophyIcon,
  calendar: CalendarDaysIcon,
};

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  locked?: boolean;
  count?: number;
  exact?: boolean;
}

function Navigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const Icon = item.locked ? LockIcon : ICONS[item.icon];
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            {item.locked ? (
              <SidebarMenuButton disabled size="lg" className="h-10 opacity-60">
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton asChild isActive={active} size="lg" className="h-10">
                <Link href={item.href} onClick={() => setOpenMobile(false)}>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            )}
            {!!item.count && (
              <SidebarMenuBadge className="top-2.5 rounded-full bg-grass-2 text-pine">
                {new Intl.NumberFormat("fa-IR").format(item.count)}
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppShell({
  home,
  items,
  userName,
  userDetail,
  logout,
  banner,
  children,
}: {
  home: string;
  items: NavItem[];
  userName: string;
  userDetail?: string;
  logout: () => Promise<void>;
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar side="right" collapsible="offcanvas">
        <SidebarHeader className="px-4 py-4">
          <Logo light href={home} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <Navigation items={items} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 ps-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              {userDetail && <p className="truncate text-xs" dir="ltr" style={{ textAlign: "right" }}>{userDetail}</p>}
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="خروج از حساب"
                title="خروج از حساب"
                className="grid size-9 place-items-center rounded-md hover:bg-sidebar-accent hover:text-white"
              >
                <LogOutIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <SidebarTrigger aria-label="باز کردن منو" />
          <Logo href={home} />
        </header>
        {banner}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
