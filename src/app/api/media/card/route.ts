import fs from "node:fs";
import path from "node:path";
import { currentUser } from "@/lib/auth";
import { getSettings, MEDIA_DIR } from "@/lib/db";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET() {
  if (!(await currentUser())) return new Response("Unauthorized", { status: 401 });
  const name = getSettings().card_image;
  if (!name) return new Response("Not found", { status: 404 });
  try {
    const data = fs.readFileSync(path.join(MEDIA_DIR, name));
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(name)] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
