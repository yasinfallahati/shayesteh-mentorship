import { notFound } from "next/navigation";
import { deleteQuestion, saveExam, saveQuestion } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, PageHeader, StatusBadge } from "@/components/kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      <Field id={`${prefix}-prompt`} label={kind === "mcq" ? "متن سوال" : "شرح تمرین عملی"}>
        <Textarea id={`${prefix}-prompt`} name="prompt" required dir="auto" defaultValue={question?.prompt} />
      </Field>
      {kind === "mcq" && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">گزینه‌ها (گزینه درست را علامت بزنید)</legend>
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
                  className="size-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="text-sm font-semibold text-muted-foreground">{"ABCD"[index]}</span>
                <Input name={`option_${index}`} required dir="auto" defaultValue={options[index]} aria-label={`گزینه ${"ABCD"[index]}`} />
              </div>
            ))}
          </div>
        </fieldset>
      )}
      <Field id={`${prefix}-points`} label="نمره" className="w-28">
        <Input id={`${prefix}-points`} name="points" type="number" min={1} max={1000} required defaultValue={question?.points ?? (kind === "mcq" ? 1 : 10)} />
      </Field>
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
      <PageHeader title={`آزمون ${course.title}`} back={{ href: "/admin/content", label: "بازگشت به زبان‌ها و مسیرها" }} />

      <Card>
        <CardHeader><CardTitle>تنظیمات آزمون</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={saveExam} className="grid gap-3">
            <input type="hidden" name="id" value={exam.id} />
            <Field id="instructions" label="توضیحات قبل از شروع"><Textarea id="instructions" name="instructions" defaultValue={exam.instructions} /></Field>
            <div className="flex flex-wrap gap-3">
              <Field id="time_limit_minutes" label="زمان (دقیقه)" className="w-36">
                <Input id="time_limit_minutes" name="time_limit_minutes" type="number" min={1} max={600} required defaultValue={exam.time_limit_minutes} />
              </Field>
              <Field id="pass_percent" label="نمره قبولی (درصد)" className="w-36">
                <Input id="pass_percent" name="pass_percent" type="number" min={1} max={100} required defaultValue={exam.pass_percent} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="is_published" defaultChecked={!!exam.is_published} className="size-4 accent-[var(--primary)]" />
              آزمون برای هنرجوها منتشر شود
            </label>
            <SubmitButton className="justify-self-start">ذخیره تنظیمات</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <h2 className="mb-2 mt-6 text-base font-semibold">سوال‌ها ({fa(questions.length)} سوال، {fa(totalPoints)} نمره)</h2>
      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">هنوز سوالی ثبت نشده است. از فرم‌های پایین اولین سوال را اضافه کنید.</p>
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {questions.map((question, index) => (
            <li key={question.id} className="p-4">
              <details>
                <summary className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate font-medium" dir="auto">{fa(index + 1)}. {question.prompt}</span>
                  <StatusBadge tone={question.kind === "mcq" ? "info" : "warning"}>{question.kind === "mcq" ? "تستی" : "عملی"}</StatusBadge>
                  <StatusBadge tone="neutral">{fa(question.points)} نمره</StatusBadge>
                  <span className="text-sm font-medium text-primary">ویرایش</span>
                </summary>
                <div className="mt-3 grid gap-3">
                  <ActionForm action={saveQuestion} className="grid gap-3">
                    <QuestionFields examId={exam.id} kind={question.kind} question={question} />
                    <SubmitButton variant="outline" size="sm" className="justify-self-start">ذخیره سوال</SubmitButton>
                  </ActionForm>
                  <ActionForm action={deleteQuestion} className="" confirm="این سوال حذف شود؟">
                    <input type="hidden" name="id" value={question.id} />
                    <SubmitButton variant="ghost" size="sm" className="text-destructive hover:text-destructive">حذف سوال</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>افزودن سوال چهارگزینه‌ای</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveQuestion} resetOnSuccess className="grid gap-3">
              <QuestionFields examId={exam.id} kind="mcq" />
              <SubmitButton className="justify-self-start">افزودن سوال تستی</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader><CardTitle>افزودن سوال عملی</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveQuestion} resetOnSuccess className="grid gap-3">
              <QuestionFields examId={exam.id} kind="practical" />
              <SubmitButton className="justify-self-start">افزودن سوال عملی</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
