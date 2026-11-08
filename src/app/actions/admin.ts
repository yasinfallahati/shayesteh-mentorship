"use server";

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireAdmin, revokeOtherSessions, type User } from "@/lib/auth";
import { db, getSettings, MEDIA_DIR, setSetting, VIDEO_DIR } from "@/lib/db";
import { getPassPercent, getQuestions, percentOf, type Attempt } from "@/lib/exams";
import { latinDigits } from "@/lib/format";
import { integer, PASSWORD_HINT, text, USERNAME_HINT, USERNAME_PATTERN, type ActionState } from "@/lib/forms";
import { generatePassword, hashPassword, verifyPassword } from "@/lib/passwords";
import { DAY_MS, renewedEnd } from "@/lib/subscription";

const refresh = () => revalidatePath("/", "layout");

function removeVideoFiles(names: string[]) {
  for (const name of names) fs.rmSync(path.join(VIDEO_DIR, name), { force: true });
}

export async function updateApplication(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const status = text(form, "status", 20);
  if (!["new", "contacted", "rejected"].includes(status)) return { error: "وضعیت معتبر نیست." };
  const changed = db()
    .prepare("UPDATE applications SET status = ?, admin_note = ?, updated_at = ? WHERE id = ? AND status != 'accepted'")
    .run(status, text(form, "admin_note", 2000), Date.now(), id).changes;
  if (!changed) return { error: "این درخواست قبلا پذیرفته شده و قابل تغییر نیست." };
  refresh();
  return { ok: true, message: "تغییرات ذخیره شد." };
}

export async function approveApplication(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const username = latinDigits(text(form, "username", 60));
  const password = text(form, "password", 200);
  const months = integer(form, "months");
  const trackId = integer(form, "track_id");
  if (!USERNAME_PATTERN.test(username)) return { error: USERNAME_HINT };
  if (password.length < 8) return { error: PASSWORD_HINT };
  if (!months || months < 1 || months > 24) return { error: "مدت اشتراک باید بین ۱ تا ۲۴ ماه باشد." };

  const database = db();
  const application = database.prepare("SELECT * FROM applications WHERE id = ?").get(id) as
    | { id: number; full_name: string; phone: string; status: string }
    | undefined;
  if (!application) return { error: "این درخواست پیدا نشد." };
  if (application.status === "accepted") return { error: "برای این درخواست قبلا حساب ساخته شده است." };
  if (!database.prepare("SELECT id FROM tracks WHERE id = ?").get(trackId)) return { error: "مسیر را انتخاب کنید." };
  if (database.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
    return { error: "این نام کاربری قبلا استفاده شده است." };
  }

  const hash = await hashPassword(password);
  const now = Date.now();
  const endsAt = renewedEnd(null, now, months);
  database.transaction(() => {
    const userId = database
      .prepare(
        `INSERT INTO users (role, username, password_hash, full_name, phone, track_id, application_id, subscription_ends_at, created_at)
         VALUES ('student', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(username, hash, application.full_name, application.phone, trackId, application.id, endsAt, now).lastInsertRowid;
    database
      .prepare(
        `INSERT INTO payments (user_id, amount, status, admin_note, created_at, reviewed_at, period_ends_at)
         VALUES (?, ?, 'approved', 'ثبت‌نام اولیه', ?, ?, ?)`,
      )
      .run(userId, Number(getSettings().monthly_price) * months, now, now, endsAt);
    database
      .prepare("UPDATE applications SET status = 'accepted', updated_at = ? WHERE id = ?")
      .run(now, application.id);
  })();
  refresh();
  return { ok: true, message: "حساب هنرجو ساخته شد.", credentials: { username, password } };
}

export async function approvePayment(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const database = db();
  const now = Date.now();
  const applied = database.transaction(() => {
    const payment = database
      .prepare("SELECT user_id FROM payments WHERE id = ? AND status = 'pending'")
      .get(id) as { user_id: number } | undefined;
    if (!payment) return false;
    const user = database.prepare("SELECT subscription_ends_at FROM users WHERE id = ?").get(payment.user_id) as Pick<
      User,
      "subscription_ends_at"
    >;
    const endsAt = renewedEnd(user.subscription_ends_at, now);
    database.prepare("UPDATE users SET subscription_ends_at = ? WHERE id = ?").run(endsAt, payment.user_id);
    database
      .prepare("UPDATE payments SET status = 'approved', reviewed_at = ?, period_ends_at = ? WHERE id = ?")
      .run(now, endsAt, id);
    return true;
  })();
  if (!applied) return { error: "این واریز قبلا بررسی شده است." };
  refresh();
  return { ok: true, message: "واریز تایید و اشتراک تمدید شد." };
}

export async function rejectPayment(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const changed = db()
    .prepare("UPDATE payments SET status = 'rejected', admin_note = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'")
    .run(text(form, "admin_note", 300), Date.now(), integer(form, "id")).changes;
  if (!changed) return { error: "این واریز قبلا بررسی شده است." };
  refresh();
  return { ok: true, message: "واریز رد شد." };
}

export async function adjustSubscription(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const days = integer(form, "days");
  if (!days || Math.abs(days) > 3650) return { error: "تعداد روز را درست وارد کنید." };
  const database = db();
  const user = database.prepare("SELECT subscription_ends_at FROM users WHERE id = ? AND role = 'student'").get(id) as
    | Pick<User, "subscription_ends_at">
    | undefined;
  if (!user) return { error: "هنرجو پیدا نشد." };
  const base = user.subscription_ends_at ?? Date.now();
  database.prepare("UPDATE users SET subscription_ends_at = ? WHERE id = ?").run(base + days * DAY_MS, id);
  refresh();
  return { ok: true, message: "تاریخ پایان اشتراک تغییر کرد." };
}

export async function changeStudentTrack(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const trackId = integer(form, "track_id");
  const database = db();
  if (!database.prepare("SELECT id FROM tracks WHERE id = ?").get(trackId)) return { error: "مسیر را انتخاب کنید." };
  database.prepare("UPDATE users SET track_id = ? WHERE id = ? AND role = 'student'").run(trackId, integer(form, "id"));
  refresh();
  return { ok: true, message: "مسیر هنرجو تغییر کرد." };
}

export async function resetStudentPassword(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const database = db();
  const user = database.prepare("SELECT username FROM users WHERE id = ? AND role = 'student'").get(id) as
    | { username: string }
    | undefined;
  if (!user) return { error: "هنرجو پیدا نشد." };
  const password = generatePassword();
  const hash = await hashPassword(password);
  database.transaction(() => {
    database.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
    database.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  })();
  return { ok: true, message: "رمز جدید ساخته شد.", credentials: { username: user.username, password } };
}

export async function toggleStudentActive(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const active = integer(form, "active") === 1 ? 1 : 0;
  const database = db();
  database.transaction(() => {
    database.prepare("UPDATE users SET is_active = ? WHERE id = ? AND role = 'student'").run(active, id);
    if (!active) database.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  })();
  refresh();
  return { ok: true, message: active ? "حساب فعال شد." : "حساب غیرفعال شد." };
}

export async function addCourse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(form, "title", 100);
  const trackId = integer(form, "track_id");
  if (title.length < 2) return { error: "نام بخش را بنویسید." };
  const database = db();
  const { next } = database
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM courses WHERE track_id = ?")
    .get(trackId) as { next: number };
  database
    .prepare("INSERT INTO courses (track_id, title, description, position) VALUES (?, ?, ?, ?)")
    .run(trackId, title, text(form, "description", 1000), next);
  refresh();
  return { ok: true, message: "بخش اضافه شد." };
}

export async function updateCourse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(form, "title", 100);
  if (title.length < 2) return { error: "نام بخش را بنویسید." };
  db()
    .prepare("UPDATE courses SET title = ?, description = ? WHERE id = ?")
    .run(title, text(form, "description", 1000), integer(form, "id"));
  refresh();
  return { ok: true, message: "بخش ذخیره شد." };
}

export async function deleteCourse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const database = db();
  const files = database.prepare("SELECT file_name FROM videos WHERE course_id = ?").all(id) as { file_name: string }[];
  database.prepare("DELETE FROM courses WHERE id = ?").run(id);
  removeVideoFiles(files.map((file) => file.file_name));
  refresh();
  return { ok: true, message: "بخش حذف شد." };
}

function swapPosition(table: "courses" | "videos" | "questions", scope: string, id: number | null, direction: number) {
  const database = db();
  const row = database.prepare(`SELECT id, position, ${scope} AS scope FROM ${table} WHERE id = ?`).get(id) as
    | { id: number; position: number; scope: number }
    | undefined;
  if (!row) return;
  const comparison = direction < 0 ? "<" : ">";
  const order = direction < 0 ? "DESC" : "ASC";
  const neighbor = database
    .prepare(`SELECT id, position FROM ${table} WHERE ${scope} = ? AND position ${comparison} ? ORDER BY position ${order} LIMIT 1`)
    .get(row.scope, row.position) as { id: number; position: number } | undefined;
  if (!neighbor) return;
  const update = database.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  database.transaction(() => {
    update.run(neighbor.position, row.id);
    update.run(row.position, neighbor.id);
  })();
}

export async function moveCourse(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  swapPosition("courses", "track_id", integer(form, "id"), integer(form, "direction") ?? 1);
  refresh();
  return {};
}

export async function moveVideo(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  swapPosition("videos", "course_id", integer(form, "id"), integer(form, "direction") ?? 1);
  refresh();
  return {};
}

export async function updateVideo(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(form, "title", 150);
  if (title.length < 2) return { error: "عنوان ویدیو را بنویسید." };
  db()
    .prepare("UPDATE videos SET title = ?, description = ? WHERE id = ?")
    .run(title, text(form, "description", 2000), integer(form, "id"));
  refresh();
  return { ok: true, message: "ویدیو ذخیره شد." };
}

export async function deleteVideo(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const database = db();
  const video = database.prepare("SELECT file_name FROM videos WHERE id = ?").get(id) as { file_name: string } | undefined;
  if (!video) return { error: "ویدیو پیدا نشد." };
  database.prepare("DELETE FROM videos WHERE id = ?").run(id);
  removeVideoFiles([video.file_name]);
  refresh();
  return { ok: true, message: "ویدیو حذف شد." };
}

export async function saveExam(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const minutes = integer(form, "time_limit_minutes");
  const pass = integer(form, "pass_percent");
  if (!minutes || minutes < 1 || minutes > 600) return { error: "زمان آزمون باید بین ۱ تا ۶۰۰ دقیقه باشد." };
  if (!pass || pass < 1 || pass > 100) return { error: "نمره قبولی باید بین ۱ تا ۱۰۰ باشد." };
  const id = integer(form, "id");
  const publish = form.get("is_published") === "on" ? 1 : 0;
  if (publish && getQuestions(id!).length === 0) return { error: "برای انتشار، اول دست‌کم یک سوال اضافه کنید." };
  db()
    .prepare("UPDATE exams SET instructions = ?, time_limit_minutes = ?, pass_percent = ?, is_published = ? WHERE id = ?")
    .run(text(form, "instructions", 3000), minutes, pass, publish, id);
  refresh();
  return { ok: true, message: "تنظیمات آزمون ذخیره شد." };
}

export async function saveQuestion(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const examId = integer(form, "exam_id");
  const kind = text(form, "kind", 20);
  const prompt = text(form, "prompt", 5000);
  const points = integer(form, "points");
  if (kind !== "mcq" && kind !== "practical") return { error: "نوع سوال معتبر نیست." };
  if (prompt.length < 3) return { error: "متن سوال را بنویسید." };
  if (!points || points < 1 || points > 1000) return { error: "نمره سوال باید بین ۱ تا ۱۰۰۰ باشد." };

  let options: string[] = [];
  let correct: number | null = null;
  if (kind === "mcq") {
    options = [0, 1, 2, 3].map((index) => text(form, `option_${index}`, 500));
    if (options.some((option) => !option)) return { error: "هر چهار گزینه را بنویسید." };
    correct = integer(form, "correct_index");
    if (correct === null || correct < 0 || correct > 3) return { error: "گزینه درست را مشخص کنید." };
  }

  const database = db();
  if (id) {
    database
      .prepare("UPDATE questions SET prompt = ?, options_json = ?, correct_index = ?, points = ? WHERE id = ?")
      .run(prompt, JSON.stringify(options), correct, points, id);
  } else {
    const { next } = database
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM questions WHERE exam_id = ?")
      .get(examId) as { next: number };
    database
      .prepare("INSERT INTO questions (exam_id, kind, prompt, options_json, correct_index, points, position) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(examId, kind, prompt, JSON.stringify(options), correct, points, next);
  }
  refresh();
  return { ok: true, message: "سوال ذخیره شد." };
}

export async function deleteQuestion(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const database = db();
  const id = integer(form, "id");
  const question = database.prepare("SELECT exam_id FROM questions WHERE id = ?").get(id) as { exam_id: number } | undefined;
  if (!question) return {};
  database.transaction(() => {
    database.prepare("DELETE FROM questions WHERE id = ?").run(id);
    if (getQuestions(question.exam_id).length === 0) {
      database.prepare("UPDATE exams SET is_published = 0 WHERE id = ?").run(question.exam_id);
    }
  })();
  refresh();
  return { ok: true, message: "سوال حذف شد." };
}

export async function gradeAttempt(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = integer(form, "id");
  const database = db();
  const attempt = database.prepare("SELECT * FROM attempts WHERE id = ? AND status = 'pending_review'").get(id) as
    | Attempt
    | undefined;
  if (!attempt) return { error: "این آزمون قبلا تصحیح شده است." };

  const practical = getQuestions(attempt.exam_id).filter((question) => question.kind === "practical");
  let earned = 0;
  const grades: [number, number][] = [];
  for (const question of practical) {
    const value = integer(form, `score_${question.id}`);
    if (value === null || value < 0 || value > question.points) {
      return { error: `نمره هر سوال باید بین ۰ و سقف همان سوال باشد.` };
    }
    earned += value;
    grades.push([value, question.id]);
  }

  // Questions deleted after the attempt lower the maximum, so it is recomputed here.
  const practicalMax = practical.reduce((sum, question) => sum + question.points, 0);
  const percent = percentOf(attempt.mcq_earned + earned, attempt.mcq_max + practicalMax);
  const status = percent >= getPassPercent(attempt.exam_id) ? "passed" : "failed";
  database.transaction(() => {
    const update = database.prepare("UPDATE answers SET awarded = ? WHERE attempt_id = ? AND question_id = ?");
    for (const [value, questionId] of grades) update.run(value, attempt.id, questionId);
    database
      .prepare(
        `UPDATE attempts SET status = ?, percent = ?, practical_earned = ?, practical_max = ?, reviewer_note = ?, reviewed_at = ?
         WHERE id = ?`,
      )
      .run(status, percent, earned, practicalMax, text(form, "reviewer_note", 3000), Date.now(), attempt.id);
  })();
  refresh();
  return { ok: true, message: status === "passed" ? "نمره ثبت شد: قبول" : "نمره ثبت شد: مردود" };
}

export async function savePaymentSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const price = Number(latinDigits(text(form, "monthly_price", 20)).replace(/[,٬\s]/g, ""));
  const card = latinDigits(text(form, "card_number", 30)).replace(/[\s-]/g, "");
  if (!Number.isInteger(price) || price <= 0) return { error: "شهریه را به تومان و فقط با عدد وارد کنید." };
  if (card && !/^\d{16}$/.test(card)) return { error: "شماره کارت باید ۱۶ رقم باشد." };
  setSetting("monthly_price", String(price));
  setSetting("card_number", card);
  setSetting("card_holder", text(form, "card_holder", 80));
  setSetting("card_bank", text(form, "card_bank", 60));
  setSetting("support_phone", latinDigits(text(form, "support_phone", 20)));
  refresh();
  return { ok: true, message: "تنظیمات پرداخت ذخیره شد." };
}

function imageExtension(data: Buffer) {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ".jpg";
  if (data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return ".png";
  if (data.subarray(0, 4).toString("latin1") === "RIFF" && data.subarray(8, 12).toString("latin1") === "WEBP") return ".webp";
  return null;
}

function removeCardFile() {
  const previous = getSettings().card_image;
  if (previous) fs.rmSync(path.join(MEDIA_DIR, previous), { force: true });
}

export async function uploadCardImage(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "یک تصویر انتخاب کنید." };
  if (file.size > 5 * 1024 * 1024) return { error: "حجم تصویر باید کمتر از ۵ مگابایت باشد." };
  const data = Buffer.from(await file.arrayBuffer());
  const extension = imageExtension(data);
  if (!extension) return { error: "فقط تصویر JPG، PNG یا WEBP قابل آپلود است." };
  removeCardFile();
  const name = `card-${randomBytes(8).toString("hex")}${extension}`;
  fs.writeFileSync(path.join(MEDIA_DIR, name), data);
  setSetting("card_image", name);
  refresh();
  return { ok: true, message: "تصویر کارت ذخیره شد." };
}

export async function removeCardImage(): Promise<ActionState> {
  await requireAdmin();
  removeCardFile();
  setSetting("card_image", "");
  refresh();
  return { ok: true, message: "تصویر کارت حذف شد." };
}

export async function changeAdminPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const next = text(form, "new_password", 200);
  if (next.length < 12) return { error: "رمز سوپرادمین باید دست‌کم ۱۲ کاراکتر باشد." };
  if (!(await verifyPassword(text(form, "current_password", 200), admin.password_hash))) {
    return { error: "رمز فعلی درست نیست." };
  }
  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(next), admin.id);
  await revokeOtherSessions(admin.id);
  return { ok: true, message: "رمز سوپرادمین تغییر کرد." };
}
