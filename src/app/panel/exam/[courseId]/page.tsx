import Link from "next/link";
import { notFound } from "next/navigation";
import { startExam } from "@/app/actions/student";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, Ring } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { closeIfExpired, getQuestions, type Attempt } from "@/lib/exams";
import { fa, faDateTime } from "@/lib/format";
import { getExamStates, getTrackProgress } from "@/lib/progress";

export default async function ExamPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireOpenStudent();
  const track = getTrackProgress(user.id, user.track_id!);
  const course = track.courses.find((candidate) => candidate.id === Number(courseId));
  if (!course) notFound();

  const firstState = getExamStates(user.id, [course]).get(course.id)!;
  if (!firstState.examId) notFound();

  const database = db();
  const exam = database.prepare("SELECT * FROM exams WHERE id = ?").get(firstState.examId) as {
    instructions: string;
    time_limit_minutes: number;
    pass_percent: number;
  };

  const open = database
    .prepare("SELECT * FROM attempts WHERE user_id = ? AND exam_id = ? AND status = 'in_progress'")
    .get(user.id, firstState.examId) as Attempt | undefined;
  if (open) closeIfExpired(open);

  const state = getExamStates(user.id, [course]).get(course.id)!;
  const attempt = state.attemptId
    ? (database.prepare("SELECT * FROM attempts WHERE id = ?").get(state.attemptId) as Attempt)
    : null;
  const questions = getQuestions(firstState.examId);
  const mcqCount = questions.filter((question) => question.kind === "mcq").length;
  const practicalCount = questions.length - mcqCount;
  const canStart = state.status === "ready" || state.status === "failed";
  const finished = attempt && attempt.status !== "in_progress";
  const timedOut = attempt?.reviewer_note === "زمان آزمون تمام شد و پاسخی ارسال نشد.";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`آزمون ${course.title}`} back={{ href: "/panel/path", label: "بازگشت به مسیر" }} />

      {finished && attempt && (
        <Card className="mb-4">
          <CardContent>
            <div className="flex items-center gap-5">
              {attempt.percent !== null && (
                <Ring value={attempt.percent} size={88} stroke={8} label={`نمره ${attempt.percent} درصد`}>
                  <span className="text-lg font-bold">٪{fa(attempt.percent)}</span>
                </Ring>
              )}
              <div>
                {attempt.status === "passed" && <p className="text-xl font-bold text-success">قبول شدید</p>}
                {attempt.status === "failed" && <p className="text-xl font-bold text-danger">این بار قبول نشدید</p>}
                {attempt.status === "pending_review" && <p className="text-xl font-bold">پاسخ‌هایتان ثبت شد</p>}
                <p className="text-sm text-muted-foreground">
                  {attempt.submitted_at && `ثبت‌شده در ${faDateTime(attempt.submitted_at)}. `}
                  {attempt.status === "pending_review" && "بعد از بررسی بخش عملی، نمره نهایی همین‌جا نمایش داده می‌شود."}
                </p>
              </div>
            </div>
            {(attempt.mcq_max > 0 || (attempt.practical_max > 0 && attempt.status !== "pending_review" && !timedOut)) && (
              <dl className="mt-4 flex gap-8 border-t pt-4 text-sm">
                {attempt.mcq_max > 0 && (
                  <div><dt className="text-muted-foreground">بخش تستی</dt><dd className="font-semibold">{fa(attempt.mcq_earned)} از {fa(attempt.mcq_max)}</dd></div>
                )}
                {attempt.practical_max > 0 && attempt.status !== "pending_review" && !timedOut && (
                  <div><dt className="text-muted-foreground">بخش عملی</dt><dd className="font-semibold">{fa(attempt.practical_earned)} از {fa(attempt.practical_max)}</dd></div>
                )}
              </dl>
            )}
            {attempt.reviewer_note && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{attempt.reviewer_note}</p>}
          </CardContent>
        </Card>
      )}

      {state.status !== "passed" && state.status !== "pending_review" && (
        <Card>
          <CardContent>
            {exam.instructions && <p className="mb-4 whitespace-pre-wrap text-muted-foreground">{exam.instructions}</p>}
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">سوال تستی</dt><dd className="font-semibold">{fa(mcqCount)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">سوال عملی</dt><dd className="font-semibold">{fa(practicalCount)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">زمان</dt><dd className="font-semibold">{fa(exam.time_limit_minutes)} دقیقه</dd></div>
              <div><dt className="text-xs text-muted-foreground">نمره قبولی</dt><dd className="font-semibold">٪{fa(exam.pass_percent)}</dd></div>
            </dl>
            <div className="mt-6">
              {state.status === "locked" && (
                <p className="rounded-lg bg-muted p-3 text-sm">اول همه ویدیوهای این بخش را کامل ببینید. تا الان ٪{fa(course.percent)} از این بخش را دیده‌اید.</p>
              )}
              {state.status === "in_progress" && state.attemptId && (
                <Button asChild><Link href={`/panel/exam/attempt/${state.attemptId}`}>ادامه آزمون</Link></Button>
              )}
              {canStart && (
                <ActionForm action={startExam} className="grid justify-items-start gap-3">
                  <input type="hidden" name="course_id" value={course.id} />
                  <p className="text-sm text-muted-foreground">زمان از لحظه شروع محاسبه می‌شود و با تمام شدن آن، پاسخ‌ها خودکار ثبت می‌شوند.</p>
                  <SubmitButton pendingLabel="در حال شروع…">{state.status === "failed" ? "شروع دوباره آزمون" : "شروع آزمون"}</SubmitButton>
                </ActionForm>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
