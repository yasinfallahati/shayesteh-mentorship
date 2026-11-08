import { headers } from "next/headers";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [existing, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(existing);
    }
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clearHits(key: string) {
  buckets.delete(key);
}

export async function clientIp() {
  const list = await headers();
  return list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
