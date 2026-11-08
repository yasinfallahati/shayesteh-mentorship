"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <h1 className="display text-4xl text-marine">این صفحه باز نشد</h1>
        <p className="mt-3 text-ink-soft">دوباره تلاش کنید. اگر تکرار شد، با پشتیبانی تماس بگیرید.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-6">تلاش دوباره</button>
      </div>
    </main>
  );
}
