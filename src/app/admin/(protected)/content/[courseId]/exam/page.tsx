import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuestion, saveExam, saveQuestion } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQuestions, type Question } from "@/lib/exams";
import { fa } from "@/lib/format";

function QuestionFields({ examId, kind, question }: { examId: number; kind: "mcq" | "practical"; question?: Question }) {
  const prefix = question ? `q${question.id}` : `new-${kind}`;
  const options = question ? (JSON.parse(question.options_json) as string[]) : ["", "", "", ""];
  return (
    <>
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="exam_id" value={examId} />
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label className="field-label" htmlFor={`${prefix}-prompt`}>{kind === "mcq" ? "متن سوال" : "شرح تمرین عملی"}</label>
        <textarea id={`${prefix}-prompt`} name="prompt" required dir="auto" defaultValue={question?.prompt} className="input" />
      </div>
      {kind === "mcq" && (
        <fieldset>
          <legend className="field-label">گزینه‌ها (گزینه درست را علامت بزنید)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_index"
                  value={index}
                  required
                  defaultChecked={question?.correct_index === index}
                  aria-label={`گزینه ${"ABCD"[index]} درست است`}
                  className="size-5 shrink-0 accent-[var(--color-grass-3)]"
                />
                <span className="font-bold text-ink-soft">{"ABCD"[index]}</span>
                <input name={`option_${index}`} required dir="auto" defaultValue={options[index]} aria-label={`گزینه ${"ABCD"[index]}`} className="input" />
              </div>
            ))}
          </div>
        </fieldset>
      )}
      <div className="w-32">
        <label className="field-label" htmlFor={`${prefix}-points`}>نمره</label>
        <input id={`${prefix}-points`} name="points" type="number" min={1} max={1000} required defaultValue={question?.points ?? (kind === "mcq" ? 1 : 10)} className="input" />
      </div>
    </>
  );
}

export default async function ExamAdminPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAdmin();
  const { courseId } = await params;
  const database = db();
  const course = database.prepare("SELECT id, title FROM courses WHERE id = ?").get(Number(courseId)) as { id: number; title: string } | undefined;
  if (!course) notFound();
  database.prepare("INSERT OR IGNORE INTO exams (course_id) VALUES (?)").run(course.id);
  const exam = database.prepare("SELECT * FROM exams WHERE course_id = ?").get(course.id) as {
    id: number;
    instructions: string;
    time_limit_minutes: number;
    pass_percent: number;
    is_published: number;
  };
  const questions = getQuestions(exam.id);
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  return (
    <>
      <Link href={`/admin/content/${course.id}`} className="text-sm text-ink-soft underline">بازگشت به {course.title}</Link>
      <h1 className="display mb-6 mt-2 text-[2rem] text-marine">آزمون {course.title}</h1>

      <section className="sheet p-5">
        <h2 className="mb-3 font-bold">تنظیمات آزمون</h2>
        <ActionForm action={saveExam} className="space-y-3">
          <input type="hidden" name="id" value={exam.id} />
          <div>
            <label className="field-label" htmlFor="instructions">توضیحات قبل از شروع</label>
            <textarea id="instructions" name="instructions" defaultValue={exam.instructions} className="input" />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-36">
              <label className="field-label" htmlFor="time_limit_minutes">زمان (دقیقه)</label>
              <input id="time_limit_minutes" name="time_limit_minutes" type="number" min={1} max={600} required defaultValue={exam.time_limit_minutes} className="input" />
            </div>
            <div className="w-36">
              <label className="field-label" htmlFor="pass_percent">نمره قبولی (درصد)</label>
              <input id="pass_percent" name="pass_percent" type="number" min={1} max={100} required defaultValue={exam.pass_percent} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="is_published" defaultChecked={!!exam.is_published} className="size-5 accent-[var(--color-grass-3)]" />
            آزمون برای هنرجوها منتشر شود
          </label>
          <SubmitButton>ذخیره تنظیمات</SubmitButton>
        </ActionForm>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 font-bold">سوال‌ها ({fa(questions.length)} سوال، {fa(totalPoints)} نمره)</h2>
        {questions.length === 0 ? (
          <p className="sheet p-5 text-sm text-ink-soft">هنوز سوالی ثبت نشده است. از فرم‌های پایین اولین سوال را اضافه کنید.</p>
        ) : (
          <ol className="sheet divide-y divide-line">
            {questions.map((question, index) => (
              <li key={question.id} className="p-4">
                <details>
                  <summary className="flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 truncate font-semibold" dir="auto">{fa(index + 1)}. {question.prompt}</span>
                    <span className={`badge ${question.kind === "mcq" ? "badge-azure" : "badge-sun"}`}>{question.kind === "mcq" ? "تستی" : "عملی"}</span>
                    <span className="badge badge-quiet">{fa(question.points)} نمره</span>
                    <span className="text-sm text-azure underline">ویرایش</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={saveQuestion} className="space-y-3">
                      <QuestionFields examId={exam.id} kind={question.kind} question={question} />
                      <SubmitButton className="btn btn-quiet btn-sm">ذخیره سوال</SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteQuestion} className="" confirm="این سوال حذف شود؟">
                      <input type="hidden" name="id" value={question.id} />
                      <SubmitButton className="btn btn-danger btn-sm" pendingLabel="…">حذف سوال</SubmitButton>
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="sheet p-5">
          <h2 className="mb-3 font-bold">افزودن سوال چهارگزینه‌ای</h2>
          <ActionForm action={saveQuestion} resetOnSuccess className="space-y-3">
            <QuestionFields examId={exam.id} kind="mcq" />
            <SubmitButton>افزودن سوال تستی</SubmitButton>
          </ActionForm>
        </section>
        <section className="sheet self-start p-5">
          <h2 className="mb-3 font-bold">افزودن سوال عملی</h2>
          <ActionForm action={saveQuestion} resetOnSuccess className="space-y-3">
            <QuestionFields examId={exam.id} kind="practical" />
            <SubmitButton>افزودن سوال عملی</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
