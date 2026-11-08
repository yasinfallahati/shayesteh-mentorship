import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebStream } from "node:stream/web";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db, VIDEO_DIR } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "video/mp4": ".mp4", "video/webm": ".webm" };

function looksLikeVideo(filePath: string) {
  const header = Buffer.alloc(12);
  const handle = fs.openSync(filePath, "r");
  fs.readSync(handle, header, 0, 12, 0);
  fs.closeSync(handle);
  const isMp4 = header.subarray(4, 8).toString("latin1") === "ftyp";
  const isWebm = header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return isMp4 || isWebm;
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "دسترسی ندارید." }, { status: 401 });

  const url = new URL(request.url);
  const courseId = Number(url.searchParams.get("courseId"));
  const title = (url.searchParams.get("title") ?? "").trim().slice(0, 150);
  const duration = Math.max(0, Math.round(Number(url.searchParams.get("duration")) || 0));
  const mimeType = (request.headers.get("content-type") ?? "").split(";")[0];
  const extension = EXTENSIONS[mimeType];

  const database = db();
  if (!database.prepare("SELECT id FROM courses WHERE id = ?").get(courseId)) {
    return Response.json({ error: "بخش پیدا نشد." }, { status: 404 });
  }
  if (title.length < 2) return Response.json({ error: "عنوان ویدیو را بنویسید." }, { status: 400 });
  if (!extension) return Response.json({ error: "فقط فایل MP4 یا WEBM قابل آپلود است." }, { status: 415 });
  if (!request.body) return Response.json({ error: "فایلی ارسال نشد." }, { status: 400 });

  const fileName = `${randomBytes(16).toString("hex")}${extension}`;
  const target = path.join(VIDEO_DIR, fileName);
  const temporary = `${target}.part`;
  let written = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      written += chunk.length;
      callback(written > MAX_BYTES ? new Error("too-large") : null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(request.body as NodeWebStream), limiter, fs.createWriteStream(temporary));
    if (written === 0 || !looksLikeVideo(temporary)) {
      fs.rmSync(temporary, { force: true });
      return Response.json({ error: "این فایل ویدیوی معتبری نیست." }, { status: 415 });
    }
    fs.renameSync(temporary, target);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    if (error instanceof Error && error.message === "too-large") {
      return Response.json({ error: "حجم ویدیو نباید بیشتر از ۸ گیگابایت باشد." }, { status: 413 });
    }
    return Response.json({ error: "آپلود نیمه‌کاره ماند. دوباره تلاش کنید." }, { status: 400 });
  }

  const { next } = database
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM videos WHERE course_id = ?")
    .get(courseId) as { next: number };
  const created = database
    .prepare(
      `INSERT INTO videos (course_id, title, duration_seconds, file_name, mime_type, file_size, position, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(courseId, title, duration, fileName, mimeType, written, next, Date.now());
  revalidatePath("/", "layout");
  return Response.json({ id: Number(created.lastInsertRowid) });
}
