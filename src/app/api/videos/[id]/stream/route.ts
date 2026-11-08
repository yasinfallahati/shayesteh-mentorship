import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { currentUser } from "@/lib/auth";
import { db, VIDEO_DIR } from "@/lib/db";
import { trackHasVideo } from "@/lib/progress";
import { subscriptionState } from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * Only a <video> tag on this site may read the file. Opening the address in a
 * tab, fetch() and download managers such as IDM do not send these headers.
 */
function isVideoElementRequest(headers: Headers) {
  const destination = headers.get("sec-fetch-dest");
  if (destination) return destination === "video" && headers.get("sec-fetch-site") === "same-origin";
  // Safari before 16.4 sends no Sec-Fetch headers at all.
  const agent = headers.get("user-agent") ?? "";
  return /AppleWebKit/.test(agent) && /Safari/.test(agent) && !/Chrome|Chromium|Edg|OPR/.test(agent);
}

function parseRange(header: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (match[1]) {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  } else {
    const suffix = Number(match[2]);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  }
  return start <= end && start < size ? { start, end } : null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const video = db().prepare("SELECT file_name, mime_type FROM videos WHERE id = ?").get(Number(id)) as
    | { file_name: string; mime_type: string }
    | undefined;
  if (!video) return new Response("Not found", { status: 404 });

  if (user.role !== "admin") {
    const blocked = subscriptionState(user.subscription_ends_at, Date.now()).phase === "blocked";
    const allowed = user.track_id !== null && trackHasVideo(user.track_id, Number(id));
    if (blocked || !allowed || !isVideoElementRequest(request.headers)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const filePath = path.join(VIDEO_DIR, video.file_name);
  let size: number;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": video.mime_type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": "inline",
  };

  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) {
    const body = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
    return new Response(body, { headers: { ...headers, "Content-Length": String(size) } });
  }

  const range = parseRange(rangeHeader, size);
  if (!range) {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  const body = Readable.toWeb(fs.createReadStream(filePath, range)) as ReadableStream;
  return new Response(body, {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(range.end - range.start + 1),
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}
