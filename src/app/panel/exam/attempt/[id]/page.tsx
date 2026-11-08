import { notFound, redirect } from "next/navigation";
import { ExamRunner } from "@/components/ExamRunner";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { closeIfExpired, getQuestions, type Attempt } from "@/lib/exams";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOpenStudent();
  const database = db();
  const stored = database
    .prepare("SELECT * FROM attempts WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id) as Attempt | undefined;
  if (!stored) notFound();

  const course = database
    .prepare("SELECT c.id, c.title FROM exams e JOIN courses c ON c.id = e.course_id WHERE e.id = ?")
    .get(stored.exam_id) as { id: number; title: string };
  const attempt = closeIfExpired(stored);
  if (attempt.status !== "in_progress") redirect(`/panel/exam/${course.id}`);

  // Only the fields below reach the browser. Correct answers stay on the server.
  const questions = getQuestions(attempt.exam_id).map((question) => ({
    id: question.id,
    kind: question.kind,
    prompt: question.prompt,
    options: JSON.parse(question.options_json) as string[],
    points: question.points,
  }));

  return (
    <ExamRunner attemptId={attempt.id} deadline={attempt.deadline_at} title={`آزمون ${course.title}`} questions={questions} />
  );
}
