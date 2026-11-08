import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl">این صفحه پیدا نشد</h1>
        <p className="mt-2 text-muted-foreground">نشانی را بررسی کنید یا به صفحه اصلی برگردید.</p>
        <Button asChild size="lg" className="mt-6"><Link href="/">رفتن به صفحه اصلی</Link></Button>
      </div>
    </main>
  );
}
