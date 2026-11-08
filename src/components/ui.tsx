import Link from "next/link";
import type { ReactNode } from "react";

export function Logo({ light = false, href = "/" }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="منتورشیپ شایسته">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect x="21" y="21" width="9" height="9" rx="2" fill="#62cf7a" />
        <rect x="10.5" y="21" width="9" height="9" rx="2" fill="#27a24b" />
        <rect x="10.5" y="10.5" width="9" height="9" rx="2" fill="#62cf7a" />
        <rect x="0" y="21" width="9" height="9" rx="2" fill="#116a35" />
        <rect x="0" y="10.5" width="9" height="9" rx="2" fill="#27a24b" />
        <rect x="0" y="0" width="9" height="9" rx="2" fill="#ffc53d" />
      </svg>
      <span className={`display text-[1.45rem] ${light ? "text-white" : "text-marine"}`}>
        منتورشیپ شایسته
      </span>
    </Link>
  );
}

export function Ring({
  value,
  size = 72,
  stroke = 7,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped} درصد`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-grass-0)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-grass-3)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset .4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function PageTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-[2rem] text-marine">{title}</h1>
        {hint && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="sheet grid place-items-center px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-md text-sm text-ink-soft">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" className={className} aria-hidden="true">
      <path d="M4 10.5 8.2 15 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 1.5a4.5 4.5 0 0 0-4.5 4.5v2H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-.5V6A4.5 4.5 0 0 0 10 1.5ZM12.5 8h-5V6a2.5 2.5 0 0 1 5 0v2Z" />
    </svg>
  );
}
