import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ring } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayer } from "@/components/VideoPlayer";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { clock, fa } from "@/lib/format";
import { getTrackProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoId = Number(id);
  const user = await requireOpenStudent();
  const video = db()
    .prepare(
      `SELECT v.id, v.title, v.description, v.course_id FROM videos v
       JOIN track_courses tc ON tc.course_id = v.course_id WHERE v.id = ? AND tc.track_id = ?`,
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
            <h1 className="text-xl">{video.title}</h1>
            {video.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-muted-foreground">{video.description}</p>}
          </div>
          {next && <Button asChild variant="outline"><Link href={`/panel/watch/${next.id}`}>ویدیوی بعدی</Link></Button>}
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <Ring value={track.percent} size={56} stroke={5} label={`${track.percent} درصد از کل مسیر`}>
            <span className="text-xs font-semibold">٪{fa(track.percent)}</span>
          </Ring>
          <div>
            <p className="font-semibold">از کل مسیر</p>
            <p className="text-sm text-muted-foreground">{fa(track.completedCount)} از {fa(track.videoCount)} ویدیو</p>
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle>{course.title}</CardTitle></CardHeader>
          <CardContent>
            <nav aria-label="ویدیوهای این بخش">
              <ul className="grid gap-0.5">
                {course.videos.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      href={`/panel/watch/${item.id}`}
                      aria-current={item.id === videoId ? "page" : undefined}
                      className={cn("flex items-center gap-2.5 rounded-md p-2 text-sm transition-colors", item.id === videoId ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-muted")}
                    >
                      <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold", item.completed ? "bg-grass-3 text-white" : "bg-muted text-muted-foreground")}>
                        {item.completed ? <CheckIcon className="size-3" aria-label="کامل" /> : fa(index + 1)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {item.duration > 0 && <span className="text-xs tabular-nums text-muted-foreground">{clock(item.duration)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
