import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { COMPLETE_PERCENT, recordActivity } from "@/lib/progress";
import { subscriptionState } from "@/lib/subscription";

export const runtime = "nodejs";

const BUCKETS = 100;
const MAX_CREDIT_SECONDS = 30;

interface Row {
  buckets: string;
  completed_at: number | null;
  updated_at: number;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const videoId = Number(id);
  const user = await currentUser();
  if (!user || user.role !== "student") return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  if (subscriptionState(user.subscription_ends_at, now).phase === "blocked") {
    return Response.json({ error: "blocked" }, { status: 403 });
  }

  const database = db();
  const video = database
    .prepare(
      "SELECT v.duration_seconds, c.track_id FROM videos v JOIN courses c ON c.id = v.course_id WHERE v.id = ?",
    )
    .get(videoId) as { duration_seconds: number; track_id: number } | undefined;
  if (!video || video.track_id !== user.track_id) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    buckets?: unknown;
    position?: unknown;
    seconds?: unknown;
    duration?: unknown;
  } | null;
  if (!body) return Response.json({ error: "invalid" }, { status: 400 });

  const newBuckets = Array.isArray(body.buckets)
    ? body.buckets.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < BUCKETS)
    : [];
  const position = typeof body.position === "number" && body.position >= 0 ? body.position : 0;
  const reported = typeof body.seconds === "number" && body.seconds > 0 ? body.seconds : 0;
  const duration = typeof body.duration === "number" && body.duration > 0 ? Math.round(body.duration) : 0;

  const result = database.transaction(() => {
    const row = database
      .prepare("SELECT buckets, completed_at, updated_at FROM video_progress WHERE user_id = ? AND video_id = ?")
      .get(user.id, videoId) as Row | undefined;

    const cells = (row?.buckets ?? "0".repeat(BUCKETS)).split("");
    for (const bucket of newBuckets) cells[bucket] = "1";
    const buckets = cells.join("");
    const percent = cells.filter((cell) => cell === "1").length;

    // A student cannot earn more study time than the wall clock has allowed.
    const wallSeconds = row ? (now - row.updated_at) / 1000 + 5 : MAX_CREDIT_SECONDS;
    const credited = Math.round(Math.min(reported, MAX_CREDIT_SECONDS, wallSeconds));
    const completedAt = row?.completed_at ?? (percent >= COMPLETE_PERCENT ? now : null);

    database
      .prepare(
        `INSERT INTO video_progress (user_id, video_id, buckets, percent, watched_seconds, last_position, completed_at, updated_at)
         VALUES (@user, @video, @buckets, @percent, @credited, @position, @completedAt, @now)
         ON CONFLICT(user_id, video_id) DO UPDATE SET
           buckets = @buckets, percent = @percent, watched_seconds = watched_seconds + @credited,
           last_position = @position, completed_at = @completedAt, updated_at = @now`,
      )
      .run({ user: user.id, video: videoId, buckets, percent, credited, position, completedAt, now });

    if (credited > 0) recordActivity(user.id, { seconds: credited }, now);
    if (video.duration_seconds === 0 && duration > 0) {
      database.prepare("UPDATE videos SET duration_seconds = ? WHERE id = ?").run(duration, videoId);
    }
    return { percent, completed: completedAt !== null, justCompleted: !row?.completed_at && completedAt !== null };
  })();

  return Response.json(result);
}
