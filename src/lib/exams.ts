import { db } from "./db";
import { recordActivity } from "./progress";

export const SUBMIT_SLACK_MS = 120_000;

export interface Attempt {
  id: number;
  user_id: number;
  exam_id: number;
  status: "in_progress" | "pending_review" | "passed" | "failed";
  started_at: number;
  deadline_at: number;
  submitted_at: number | null;
  mcq_earned: number;
  mcq_max: number;
  practical_earned: number;
  practical_max: number;
  percent: number | null;
  reviewer_note: string;
}

export interface Question {
  id: number;
  exam_id: number;
  kind: "mcq" | "practical";
  prompt: string;
  options_json: string;
  correct_index: number | null;
  points: number;
  position: number;
}

export const percentOf = (earned: number, max: number) => (max === 0 ? 0 : Math.round((earned / max) * 100));

export function getQuestions(examId: number) {
  return db()
    .prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY position, id")
    .all(examId) as Question[];
}

export function getPassPercent(examId: number) {
  const exam = db().prepare("SELECT pass_percent FROM exams WHERE id = ?").get(examId) as { pass_percent: number };
  return exam.pass_percent;
}

/** Closes an attempt whose time ran out without a submission. */
export function closeIfExpired(attempt: Attempt, now = Date.now()) {
  if (attempt.status !== "in_progress" || now <= attempt.deadline_at + SUBMIT_SLACK_MS) return attempt;
  db()
    .prepare(
      "UPDATE attempts SET status = 'failed', percent = 0, submitted_at = ?, reviewer_note = 'زمان آزمون تمام شد و پاسخی ارسال نشد.' WHERE id = ? AND status = 'in_progress'",
    )
    .run(now, attempt.id);
  return { ...attempt, status: "failed" as const, percent: 0, reviewer_note: "زمان آزمون تمام شد و پاسخی ارسال نشد." };
}

export interface SubmittedAnswer {
  questionId: number;
  selected: number | null;
  text: string;
}

export function gradeSubmission(attempt: Attempt, submitted: SubmittedAnswer[], now = Date.now()) {
  const database = db();
  const questions = getQuestions(attempt.exam_id);
  const byId = new Map(submitted.map((answer) => [answer.questionId, answer]));
  const insert = database.prepare(
    "INSERT INTO answers (attempt_id, question_id, selected_index, text_answer, awarded) VALUES (?, ?, ?, ?, ?)",
  );

  return database.transaction(() => {
    let mcqEarned = 0;
    let mcqMax = 0;
    let practicalMax = 0;
    for (const question of questions) {
      const answer = byId.get(question.id);
      if (question.kind === "mcq") {
        mcqMax += question.points;
        const selected = typeof answer?.selected === "number" ? answer.selected : null;
        const awarded = selected !== null && selected === question.correct_index ? question.points : 0;
        mcqEarned += awarded;
        insert.run(attempt.id, question.id, selected, "", awarded);
      } else {
        practicalMax += question.points;
        insert.run(attempt.id, question.id, null, (answer?.text ?? "").slice(0, 20_000), null);
      }
    }

    let status: Attempt["status"] = "pending_review";
    let percent: number | null = null;
    if (practicalMax === 0) {
      percent = percentOf(mcqEarned, mcqMax);
      status = percent >= getPassPercent(attempt.exam_id) ? "passed" : "failed";
    }
    const changed = database
      .prepare(
        `UPDATE attempts SET status = ?, percent = ?, submitted_at = ?, mcq_earned = ?, mcq_max = ?, practical_max = ?
         WHERE id = ? AND status = 'in_progress'`,
      )
      .run(status, percent, now, mcqEarned, mcqMax, practicalMax, attempt.id).changes;
    if (changed !== 1) throw new Error("Attempt already closed");
    recordActivity(attempt.user_id, { exams: 1 }, now);
    return status;
  })();
}
