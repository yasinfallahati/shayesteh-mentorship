"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LockIcon } from "./ui";

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />,
  path: <path d="M6 3a3 3 0 0 1 1 5.83V13a3 3 0 0 0 3 3h4.17a3 3 0 1 1 0 2H10a5 5 0 0 1-5-5V8.83A3 3 0 0 1 6 3Z" />,
  card: <path d="M3 5h18a1 1 0 0 1 1 1v3H2V6a1 1 0 0 1 1-1Zm-1 7h20v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6Zm3 3v2h5v-2H5Z" />,
  gear: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 5.5-2.1.4a7 7 0 0 1-.6 1.5l1.2 1.8-2.1 2.1-1.8-1.2a7 7 0 0 1-1.5.6L13.5 21h-3l-.4-2.3a7 7 0 0 1-1.5-.6l-1.8 1.2-2.1-2.1 1.2-1.8a7 7 0 0 1-.6-1.5L3 13.5v-3l2.3-.4a7 7 0 0 1 .6-1.5L4.7 6.800l2.1-2.1 1.8 1.2a7 7 0 0 1 1.5-.6L10.500 3h3l.4 2.300a7 7 0 0 1 1.500.6l1.800-1.200 2.100 2.100-1.200 1.800a7 7 0 0 1 .6 1.500l2.300.4v3Z" />,
  inbox: <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 11v5h14v-5h-4a3 3 0 0 1-6 0H5Z" />,
  people: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.900 3.100-7 7-7s7 3.100 7 7H2Zm15.500-9a3.500 3.500 0 0 0 0-7c-.5 0-1 .1-1.400.3a6 6 0 0 1 0 6.400c.4.2.9.3 1.400.3Zm.5 2.100c2.300.8 4 3 4 5.900v1h-4c0-2.700-.9-5.100-2.400-6.900h2.400Z" />,
  video: <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm6 4.500v7l6-3.500-6-3.500Z" />,
  check: <path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm2.700 10.300-1.400 1.400 3.700 3.700 7.200-7.200-1.400-1.400-5.800 5.800-2.300-2.300Z" />,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS | string;
  locked?: boolean;
  count?: number;
  exact?: boolean;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        if (item.locked) {
          return (
            <span key={item.href} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.7rem] text-[#7f9cb5] lg:flex-none lg:flex-row lg:gap-3 lg:px-4 lg:py-2.5 lg:text-[0.9375rem]">
              <LockIcon className="size-5" />
              {item.label}
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-w-16 flex-1 shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.7rem] font-medium whitespace-nowrap transition-colors lg:flex-none lg:flex-row lg:gap-3 lg:px-4 lg:py-2.5 lg:text-[0.9375rem] ${
              active ? "bg-white text-marine" : "text-[#d6e6f3] hover:bg-marine-2"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0" aria-hidden="true">
              {ICONS[item.icon]}
            </svg>
            <span>{item.label}</span>
            {!!item.count && (
              <span className="rounded-full bg-sun px-1.5 text-xs font-bold text-marine lg:ms-auto">
                {new Intl.NumberFormat("fa-IR").format(item.count)}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
