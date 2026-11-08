import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CheckIcon, Ring } from "@/components/ui";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { clock, fa } from "@/lib/format";
import { getTrackProgress } from "@/lib/progress";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoId = Number(id);
  const user = await requireOpenStudent();
  const video = db()
    .prepare(
      `SELECT v.id, v.title, v.description, v.course_id FROM videos v
       JOIN courses c ON c.id = v.course_id WHERE v.id = ? AND c.track_id = ?`,
    )
    .get(videoId, user.track_id) as { id: number; title: string; description: string; course_id: number } | undefined;
  if (!video) notFound();

  const progress = db()
    .prepare("SELECT percent, last_position, completed_at FROM video_progress WHERE user_id = ? AND video_id = ?")
    .get(user.id, videoId) as { percent: number; last_position: number; completed_at: number | null } | undefined;
  const track = getTrackProgress(user.id, user.track_id!);
  const course = track.courses.find((candidate) => candidate.id === video.course_id)!;
  const position = course.videos.findIndex((candidate) => candidate.id === videoId);
  const next = course.videos[position + 1];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <VideoPlayer
          key={videoId}
          videoId={videoId}
          lastPosition={progress?.last_position ?? 0}
          initialPercent={progress?.percent ?? 0}
          initialCompleted={progress?.completed_at != null}
        />
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="display text-3xl text-marine">{video.title}</h1>
            {video.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-ink-soft">{video.description}</p>}
          </div>
          {next && <Link href={`/panel/watch/${next.id}`} className="btn btn-quiet">ویدیوی بعدی</Link>}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="sheet flex items-center gap-4 p-4">
          <Ring value={track.percent} size={64} stroke={7} label={`${track.percent} درصد از کل مسیر`}>
            <span className="text-sm font-bold">٪{fa(track.percent)}</span>
          </Ring>
          <div>
            <p className="font-bold">از کل مسیر</p>
            <p className="text-sm text-ink-soft">{fa(track.completedCount)} از {fa(track.videoCount)} ویدیو</p>
          </div>
        </div>
        <nav className="sheet p-3" aria-label="ویدیوهای این بخش">
          <h2 className="px-2 pb-2 font-bold">{course.title}</h2>
          <ul>
            {course.videos.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={`/panel/watch/${item.id}`}
                  aria-current={item.id === videoId ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg p-2 text-sm ${item.id === videoId ? "bg-sky font-bold" : "hover:bg-mist"}`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded text-xs font-bold ${item.completed ? "bg-grass-3 text-white" : "bg-grass-0 text-ink-soft"}`}>
                    {item.completed ? <CheckIcon className="size-3.5" /> : fa(index + 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {item.duration > 0 && <span className="text-xs tabular-nums text-ink-soft">{clock(item.duration)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
