import { notFound } from "next/navigation";
import { gradeAttempt } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, PageHeader } from "@/components/kit";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPassPercent, type Attempt } from "@/lib/exams";
import { fa, faDateTime } from "@/lib/format";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const database = db();
  const attempt = database
    .prepare(
      `SELECT a.*, u.full_name, c.title AS course_title
       FROM attempts a JOIN users u ON u.id = a.user_id JOIN exams e ON e.id = a.exam_id JOIN courses c ON c.id = e.course_id
       WHERE a.id = ?`,
    )
    .get(Number(id)) as (Attempt & { full_name: string; course_title: string }) | undefined;
  if (!attempt) notFound();
  const answers = database
    .prepare(
      `SELECT q.id, q.prompt, q.points, an.text_answer, an.awarded
       FROM answers an JOIN questions q ON q.id = an.question_id
       WHERE an.attempt_id = ? AND q.kind = 'practical' ORDER BY q.position, q.id`,
    )
    .all(attempt.id) as { id: number; prompt: string; points: number; text_answer: string; awarded: number | null }[];
  const open = attempt.status === "pending_review";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${attempt.full_name}، آزمون ${attempt.course_title}`}
        back={{ href: "/admin/reviews", label: "بازگشت به فهرست تصحیح" }}
        description={
          <>
            {attempt.submitted_at && `ثبت‌شده در ${faDateTime(attempt.submitted_at)}. `}
            بخش تستی: {fa(attempt.mcq_earned)} از {fa(attempt.mcq_max)} نمره. نمره قبولی: ٪{fa(getPassPercent(attempt.exam_id))}
          </>
        }
      />
      {!open && <p className="mb-4 rounded-xl border bg-card p-4 font-medium">این آزمون تصحیح شده است. نمره نهایی: ٪{fa(attempt.percent ?? 0)}</p>}
      <ActionForm action={gradeAttempt}>
        <input type="hidden" name="id" value={attempt.id} />
        {answers.map((answer, index) => (
          <Card key={answer.id}>
            <CardContent>
              <p className="whitespace-pre-wrap font-semibold" dir="auto">{fa(index + 1)}. {answer.prompt}</p>
              <pre dir="ltr" className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-pine p-4 text-left font-mono text-sm text-white">
                {answer.text_answer || "(بدون پاسخ)"}
              </pre>
              <div className="mt-3 flex items-center gap-2">
                <Label htmlFor={`score_${answer.id}`}>نمره از {fa(answer.points)}</Label>
                <Input id={`score_${answer.id}`} name={`score_${answer.id}`} type="number" min={0} max={answer.points} required disabled={!open} defaultValue={answer.awarded ?? undefined} className="w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Field id="reviewer_note" label="بازخورد برای هنرجو">
          <Textarea id="reviewer_note" name="reviewer_note" disabled={!open} defaultValue={attempt.reviewer_note} />
        </Field>
        {open && <SubmitButton className="justify-self-start" pendingLabel="در حال ثبت…">ثبت نمره نهایی</SubmitButton>}
      </ActionForm>
    </div>
  );
}
