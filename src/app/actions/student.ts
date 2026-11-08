"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOpenStudent, requireStudent, revokeOtherSessions } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import {
  closeIfExpired,
  gradeSubmission,
  SUBMIT_SLACK_MS,
  type Attempt,
  type SubmittedAnswer,
} from "@/lib/exams";
import { latinDigits } from "@/lib/format";
import { PASSWORD_HINT, text, USERNAME_HINT, USERNAME_PATTERN, type ActionState } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getExamStates, getTrackProgress } from "@/lib/progress";

export async function declarePayment(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStudent();
  const settings = getSettings();
  if (!settings.card_number) return { error: "شماره کارت هنوز ثبت نشده است. با پشتیبانی تماس بگیرید." };
  const tracking = latinDigits(text(form, "tracking_code", 40));
  const pending = db()
    .prepare(
      `INSERT INTO payments (user_id, amount, tracking_code, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING`,
    )
    .run(user.id, Number(settings.monthly_price), tracking, Date.now());
  revalidatePath("/panel", "layout");
  if (pending.changes === 0) return { message: "واریز قبلی شما هنوز در حال بررسی است." };
  return { ok: true, message: "اعلام واریز ثبت شد. بعد از تایید، اشتراک شما تمدید می‌شود." };
}

export async function changeUsername(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStudent();
  const username = latinDigits(text(form, "username", 60));
  if (!USERNAME_PATTERN.test(username)) return { error: USERNAME_HINT };
  if (!(await verifyPassword(text(form, "password", 200), user.password_hash))) {
    return { error: "رمز عبور فعلی درست نیست." };
  }
  const taken = db().prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, user.id);
  if (taken) return { error: "این نام کاربری قبلا انتخاب شده است." };
  db().prepare("UPDATE users SET username = ? WHERE id = ?").run(username, user.id);
  revalidatePath("/panel", "layout");
  return { ok: true, message: "نام کاربری تغییر کرد." };
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStudent();
  const next = text(form, "new_password", 200);
  if (next.length < 8) return { error: PASSWORD_HINT };
  if (next !== text(form, "confirm_password", 200)) return { error: "رمز جدید و تکرار آن یکی نیستند." };
  if (!(await verifyPassword(text(form, "current_password", 200), user.password_hash))) {
    return { error: "رمز عبور فعلی درست نیست." };
  }
  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(next), user.id);
  await revokeOtherSessions(user.id);
  return { ok: true, message: "رمز عبور تغییر کرد." };
}

export async function startExam(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOpenStudent();
  const courseId = Number(text(form, "course_id", 20));
  const progress = getTrackProgress(user.id, user.track_id!);
  const course = progress.courses.find((candidate) => candidate.id === courseId);
  if (!course) return { error: "این آزمون در مسیر شما نیست." };
  if (!course.allVideosDone) return { error: "اول همه ویدیوهای این بخش را کامل ببینید." };
  const state = getExamStates(user.id, [course]).get(course.id)!;
  if (!state.examId) return { error: "آزمون این بخش هنوز منتشر نشده است." };
  if (state.status === "passed") return { error: "این آزمون را قبلا قبول شده‌اید." };
  if (state.status === "pending_review") return { error: "پاسخ‌های شما در حال بررسی است." };

  const database = db();
  const open = database
    .prepare("SELECT * FROM attempts WHERE user_id = ? AND exam_id = ? AND status = 'in_progress'")
    .get(user.id, state.examId) as Attempt | undefined;
  if (open && closeIfExpired(open).status === "in_progress") redirect(`/panel/exam/attempt/${open.id}`);

  const exam = database.prepare("SELECT time_limit_minutes FROM exams WHERE id = ?").get(state.examId) as {
    time_limit_minutes: number;
  };
  const now = Date.now();
  const created = database
    .prepare("INSERT INTO attempts (user_id, exam_id, status, started_at, deadline_at) VALUES (?, ?, 'in_progress', ?, ?)")
    .run(user.id, state.examId, now, now + exam.time_limit_minutes * 60_000);
  redirect(`/panel/exam/attempt/${created.lastInsertRowid}`);
}

export async function submitExam(attemptId: number, submitted: SubmittedAnswer[]) {
  const user = await requireOpenStudent();
  const attempt = db()
    .prepare("SELECT * FROM attempts WHERE id = ? AND user_id = ?")
    .get(attemptId, user.id) as Attempt | undefined;
  if (!attempt) redirect("/panel/path");

  const course = db().prepare("SELECT course_id FROM exams WHERE id = ?").get(attempt.exam_id) as { course_id: number };
  const now = Date.now();
  if (attempt.status === "in_progress" && now <= attempt.deadline_at + SUBMIT_SLACK_MS) {
    try {
      gradeSubmission(attempt, Array.isArray(submitted) ? submitted : [], now);
    } catch (error) {
      if (!(error instanceof Error && error.message === "Attempt already closed")) throw error;
    }
  } else {
    closeIfExpired(attempt, now);
  }
  revalidatePath("/panel", "layout");
  redirect(`/panel/exam/${course.course_id}`);
}
