import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-[linear-gradient(180deg,#9fd3ff_0%,#e6f4ff_100%)] px-4 text-center">
      <div>
        <h1 className="display text-5xl text-marine">این صفحه پیدا نشد</h1>
        <p className="mt-3 text-ink-soft">نشانی را بررسی کنید یا به صفحه اصلی برگردید.</p>
        <Link href="/" className="btn btn-primary mt-6">رفتن به صفحه اصلی</Link>
      </div>
    </main>
  );
}
