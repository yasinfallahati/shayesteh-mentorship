"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl">این صفحه باز نشد</h1>
        <p className="mt-2 text-muted-foreground">دوباره تلاش کنید. اگر تکرار شد، با پشتیبانی تماس بگیرید.</p>
        <Button size="lg" className="mt-6" onClick={reset}>تلاش دوباره</Button>
      </div>
    </main>
  );
}
