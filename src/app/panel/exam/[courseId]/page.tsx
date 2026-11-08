import Link from "next/link";
import { notFound } from "next/navigation";
import { startExam } from "@/app/actions/student";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Ring } from "@/components/ui";
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

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/panel/path" className="text-sm text-ink-soft underline">بازگشت به مسیر</Link>
      <h1 className="display mt-2 text-4xl text-marine">آزمون {course.title}</h1>

      {finished && attempt && (
        <section className="sheet mt-5 p-6">
          <div className="flex items-center gap-5">
            {attempt.percent !== null && (
              <Ring value={attempt.percent} size={96} stroke={9} label={`نمره ${attempt.percent} درصد`}>
                <span className="display text-2xl text-marine">٪{fa(attempt.percent)}</span>
              </Ring>
            )}
            <div>
              {attempt.status === "passed" && <p className="display text-3xl text-grass-4">قبول شدید</p>}
              {attempt.status === "failed" && <p className="display text-3xl text-[#a32a1f]">این بار قبول نشدید</p>}
              {attempt.status === "pending_review" && <p className="display text-3xl text-marine">پاسخ‌هایتان ثبت شد</p>}
              <p className="text-sm text-ink-soft">
                {attempt.submitted_at && `ثبت‌شده در ${faDateTime(attempt.submitted_at)}. `}
                {attempt.status === "pending_review" && "بعد از بررسی بخش عملی، نمره نهایی همین‌جا نمایش داده می‌شود."}
              </p>
            </div>
          </div>
          {attempt.mcq_max > 0 && (
            <p className="mt-4 text-sm">بخش تستی: {fa(attempt.mcq_earned)} از {fa(attempt.mcq_max)} نمره</p>
          )}
          {attempt.practical_max > 0 && attempt.status !== "pending_review" && attempt.reviewer_note !== "زمان آزمون تمام شد و پاسخی ارسال نشد." && (
            <p className="text-sm">بخش عملی: {fa(attempt.practical_earned)} از {fa(attempt.practical_max)} نمره</p>
          )}
          {attempt.reviewer_note && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-mist p-3 text-sm">{attempt.reviewer_note}</p>
          )}
        </section>
      )}

      {state.status !== "passed" && state.status !== "pending_review" && (
        <section className="sheet mt-5 p-6">
          {exam.instructions && <p className="mb-4 whitespace-pre-wrap text-ink-soft">{exam.instructions}</p>}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="text-xs text-ink-soft">سوال تستی</dt><dd className="font-bold">{fa(mcqCount)}</dd></div>
            <div><dt className="text-xs text-ink-soft">سوال عملی</dt><dd className="font-bold">{fa(practicalCount)}</dd></div>
            <div><dt className="text-xs text-ink-soft">زمان</dt><dd className="font-bold">{fa(exam.time_limit_minutes)} دقیقه</dd></div>
            <div><dt className="text-xs text-ink-soft">نمره قبولی</dt><dd className="font-bold">٪{fa(exam.pass_percent)}</dd></div>
          </dl>

          <div className="mt-6">
            {state.status === "locked" && (
              <p className="rounded-xl bg-mist p-3 text-sm">اول همه ویدیوهای این بخش را کامل ببینید. تا الان ٪{fa(course.percent)} از این بخش را دیده‌اید.</p>
            )}
            {state.status === "in_progress" && state.attemptId && (
              <Link href={`/panel/exam/attempt/${state.attemptId}`} className="btn btn-primary">ادامه آزمون</Link>
            )}
            {canStart && (
              <ActionForm action={startExam} className="space-y-3">
                <input type="hidden" name="course_id" value={course.id} />
                <p className="text-sm text-ink-soft">زمان از لحظه شروع محاسبه می‌شود و با تمام شدن آن، پاسخ‌ها خودکار ثبت می‌شوند.</p>
                <SubmitButton className="btn btn-grass" pendingLabel="در حال شروع…">
                  {state.status === "failed" ? "شروع دوباره آزمون" : "شروع آزمون"}
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
