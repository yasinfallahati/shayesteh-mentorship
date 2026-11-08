import Link from "next/link";
import { CheckIcon, EmptyState, LockIcon, PageTitle, Ring } from "@/components/ui";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { clock, fa } from "@/lib/format";
import { getExamStates, getTrackProgress, type CourseExam } from "@/lib/progress";

function ExamRow({ courseId, state }: { courseId: number; state: CourseExam }) {
  if (state.status === "none") return null;
  const view: Record<Exclude<CourseExam["status"], "none">, { text: string; badge: string; label: string }> = {
    locked: { text: "بعد از دیدن همه ویدیوها باز می‌شود", badge: "badge-quiet", label: "قفل" },
    ready: { text: "آزمون تستی و عملی این بخش آماده است", badge: "badge-azure", label: "آماده" },
    in_progress: { text: "آزمون را شروع کرده‌اید", badge: "badge-sun", label: "در حال انجام" },
    pending_review: { text: "پاسخ‌های عملی شما در حال بررسی است", badge: "badge-sun", label: "در حال بررسی" },
    passed: { text: `نمره نهایی: ٪${fa(state.percent ?? 0)}`, badge: "badge-grass", label: "قبول" },
    failed: { text: "می‌توانید دوباره آزمون بدهید", badge: "badge-ember", label: "مردود" },
  };
  const current = view[state.status];
  const inner = (
    <>
      <span className="flex items-center gap-2 font-bold">
        {state.status === "locked" && <LockIcon className="size-4 text-ink-soft" />}
        آزمون پایان بخش
      </span>
      <span className="flex items-center gap-2 text-sm text-ink-soft">
        <span className="hidden sm:inline">{current.text}</span>
        <span className={`badge ${current.badge}`}>{current.label}</span>
      </span>
    </>
  );
  const classes = "flex items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3";
  if (state.status === "locked") return <div className={classes}>{inner}</div>;
  return <Link href={`/panel/exam/${courseId}`} className={`${classes} hover:bg-sky`}>{inner}</Link>;
}

export default async function PathPage() {
  const user = await requireOpenStudent();
  const track = db().prepare("SELECT title FROM tracks WHERE id = ?").get(user.track_id) as { title: string };
  const progress = getTrackProgress(user.id, user.track_id!);
  const exams = getExamStates(user.id, progress.courses);
  const hasVideos = progress.videoCount > 0;

  return (
    <>
      <PageTitle
        title={`مسیر ${track.title}`}
        hint={hasVideos ? `${fa(progress.completedCount)} از ${fa(progress.videoCount)} ویدیو کامل شده، ٪${fa(progress.percent)} از کل مسیر` : undefined}
      />
      {!hasVideos ? (
        <EmptyState title="ویدیوهای این مسیر به‌زودی اضافه می‌شوند" hint="به‌محض اضافه شدن، همین‌جا آن‌ها را می‌بینید." />
      ) : (
        <ol className="space-y-5">
          {progress.courses.map((course, index) => (
            <li key={course.id} className="sheet p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-grass-4">بخش {fa(index + 1)}</p>
                  <h2 className="display text-3xl text-marine">{course.title}</h2>
                  {course.description && <p className="mt-1 text-sm text-ink-soft">{course.description}</p>}
                </div>
                <Ring value={course.percent} size={68} stroke={7} label={`${course.percent} درصد`}>
                  <span className="text-sm font-bold">٪{fa(course.percent)}</span>
                </Ring>
              </div>

              {course.videos.length === 0 ? (
                <p className="mt-4 text-sm text-ink-soft">ویدیوهای این بخش هنوز اضافه نشده‌اند.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {course.videos.map((video, videoIndex) => (
                    <li key={video.id}>
                      <Link href={`/panel/watch/${video.id}`} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-mist">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${video.completed ? "bg-grass-3 text-white" : "bg-grass-0 text-ink-soft"}`}>
                          {video.completed ? <CheckIcon /> : fa(videoIndex + 1)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{video.title}</span>
                        {video.percent > 0 && !video.completed && <span className="text-xs font-bold text-azure">٪{fa(video.percent)}</span>}
                        {video.duration > 0 && <span className="text-xs tabular-nums text-ink-soft">{clock(video.duration)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4"><ExamRow courseId={course.id} state={exams.get(course.id)!} /></div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
