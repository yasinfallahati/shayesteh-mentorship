import { CheckIcon, LockIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge, type Tone } from "@/components/kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { clock, fa } from "@/lib/format";
import { getExamStates, getTrackProgress, type CourseExam } from "@/lib/progress";

function ExamRow({ courseId, state }: { courseId: number; state: CourseExam }) {
  if (state.status === "none") return null;
  const view: Record<Exclude<CourseExam["status"], "none">, { text: string; tone: Tone; label: string }> = {
    locked: { text: "بعد از دیدن همه ویدیوها باز می‌شود", tone: "neutral", label: "قفل" },
    ready: { text: "آزمون تستی و عملی این بخش آماده است", tone: "info", label: "آماده" },
    in_progress: { text: "آزمون را شروع کرده‌اید", tone: "warning", label: "در حال انجام" },
    pending_review: { text: "پاسخ‌های عملی شما در حال بررسی است", tone: "warning", label: "در حال بررسی" },
    passed: { text: `نمره نهایی: ٪${fa(state.percent ?? 0)}`, tone: "success", label: "قبول" },
    failed: { text: "می‌توانید دوباره آزمون بدهید", tone: "danger", label: "مردود" },
  };
  const current = view[state.status];
  const inner = (
    <>
      <span className="flex items-center gap-2 font-medium">
        {state.status === "locked" && <LockIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
        آزمون پایان بخش
      </span>
      <span className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{current.text}</span>
        <StatusBadge tone={current.tone}>{current.label}</StatusBadge>
      </span>
    </>
  );
  const classes = "mt-2 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5 transition-colors";
  if (state.status === "locked") return <div className={classes}>{inner}</div>;
  return <Link href={`/panel/exam/${courseId}`} className={`${classes} hover:bg-accent`}>{inner}</Link>;
}

export default async function PathPage() {
  const user = await requireOpenStudent();
  const track = db().prepare("SELECT title FROM tracks WHERE id = ?").get(user.track_id) as { title: string };
  const progress = getTrackProgress(user.id, user.track_id!);
  const exams = getExamStates(user.id, progress.courses);
  const hasVideos = progress.videoCount > 0;
  const current = progress.courses.find((course) => course.videos.length > 0 && !course.allVideosDone) ?? progress.courses[0];

  return (
    <>
      <PageHeader
        title={`مسیر ${track.title}`}
        description={hasVideos ? `${fa(progress.completedCount)} از ${fa(progress.videoCount)} ویدیو کامل شده، ٪${fa(progress.percent)} از کل مسیر` : undefined}
      />
      {!hasVideos ? (
        <EmptyState title="ویدیوهای این مسیر به‌زودی اضافه می‌شوند" description="به‌محض اضافه شدن، همین‌جا آن‌ها را می‌بینید." />
      ) : (
        <Accordion type="multiple" defaultValue={current ? [String(current.id)] : []} className="grid gap-3">
          {progress.courses.map((course, index) => (
            <AccordionItem key={course.id} value={String(course.id)} className="rounded-xl border bg-card px-4 last:border-b">
              <AccordionTrigger className="items-center gap-4 py-4 hover:no-underline">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
                  {course.allVideosDone ? <CheckIcon className="size-4" aria-label="کامل شده" /> : fa(index + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{course.title}</span>
                  <span className="mt-1.5 flex items-center gap-3">
                    <Progress value={course.percent} className="h-1 max-w-48" aria-hidden="true" />
                    <span className="text-xs font-normal text-muted-foreground">٪{fa(course.percent)}</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="[&_a]:no-underline">
                {course.description && <p className="mb-2 text-sm text-muted-foreground">{course.description}</p>}
                {course.videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ویدیوهای این بخش هنوز اضافه نشده‌اند.</p>
                ) : (
                  <ul>
                    {course.videos.map((video) => (
                      <li key={video.id}>
                        <Link href={`/panel/watch/${video.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted">
                          <span className={`grid size-6 shrink-0 place-items-center rounded-full ${video.completed ? "bg-grass-3 text-white" : "bg-muted text-muted-foreground"}`}>
                            {video.completed ? <CheckIcon className="size-3.5" aria-label="کامل" /> : <PlayIcon className="size-3 fill-current" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{video.title}</span>
                          {video.percent > 0 && !video.completed && <span className="text-xs font-semibold text-primary">٪{fa(video.percent)}</span>}
                          {video.duration > 0 && <span className="text-xs tabular-nums text-muted-foreground">{clock(video.duration)}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <ExamRow courseId={course.id} state={exams.get(course.id)!} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </>
  );
}
