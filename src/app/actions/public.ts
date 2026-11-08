"use server";

import { redirect } from "next/navigation";
import { endSession, startSession, type User } from "@/lib/auth";
import { db } from "@/lib/db";
import { latinDigits } from "@/lib/format";
import { integer, text, type ActionState } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { clearHits, clientIp, hit } from "@/lib/rate-limit";

const MINUTE = 60_000;
const LEVELS = ["بدون تجربه", "کمی بلدم", "پروژه کوچک ساخته‌ام", "شاغل در حوزه نرم‌افزار"];
const HOURS = ["کمتر از ۵ ساعت", "۵ تا ۱۰ ساعت", "۱۰ تا ۲۰ ساعت", "بیشتر از ۲۰ ساعت"];

export async function submitApplication(_: ActionState, form: FormData): Promise<ActionState> {
  // Bots fill the hidden field. They get the normal success response and nothing is saved.
  if (text(form, "website")) return { ok: true };

  const ip = await clientIp();
  if (!hit(`apply:${ip}`, 5, 60 * MINUTE)) {
    return { error: "تعداد درخواست‌ها زیاد شد. یک ساعت دیگر دوباره فرم را بفرستید." };
  }

  const fullName = text(form, "full_name", 80);
  const phone = latinDigits(text(form, "phone", 20)).replace(/[\s-]/g, "");
  const trackId = integer(form, "track_id");
  const level = text(form, "level", 40);
  const weeklyHours = text(form, "weekly_hours", 40);
  const goal = text(form, "goal", 1000);

  if (fullName.length < 3) return { error: "نام و نام خانوادگی را کامل بنویسید." };
  if (!/^09\d{9}$/.test(phone)) return { error: "شماره موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود." };
  if (!LEVELS.includes(level)) return { error: "سطح فعلی‌تان را انتخاب کنید." };
  if (!HOURS.includes(weeklyHours)) return { error: "زمان آزاد هفتگی‌تان را انتخاب کنید." };

  const database = db();
  const track = trackId && database.prepare("SELECT id FROM tracks WHERE id = ?").get(trackId);
  if (!track) return { error: "مسیر آموزشی را انتخاب کنید." };

  const open = database
    .prepare("SELECT id FROM applications WHERE phone = ? AND status IN ('new','contacted')")
    .get(phone);
  if (open) return { ok: true, message: "duplicate" };

  const now = Date.now();
  database
    .prepare(
      `INSERT INTO applications (full_name, phone, track_id, level, weekly_hours, goal, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(fullName, phone, trackId, level, weeklyHours, goal, now, now);
  return { ok: true };
}

// Verified when the username does not exist so both cases take the same time.
let decoyHash: string | undefined;

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const username = latinDigits(text(form, "username", 60));
  const password = text(form, "password", 200);
  const ip = await clientIp();
  const key = `login:${ip}:${username.toLowerCase()}`;
  if (!hit(key, 8, 15 * MINUTE)) {
    return { error: "تلاش‌های ناموفق زیاد شد. ۱۵ دقیقه دیگر دوباره وارد شوید." };
  }

  const user = db()
    .prepare("SELECT * FROM users WHERE username = ? AND role = 'student'")
    .get(username) as User | undefined;
  decoyHash ??= await hashPassword("decoy-password");
  const valid = await verifyPassword(password, user?.password_hash ?? decoyHash);
  if (!user || !valid) return { error: "نام کاربری یا رمز عبور درست نیست." };
  if (!user.is_active) {
    return { error: "این حساب غیرفعال شده است. برای فعال‌سازی با پشتیبانی تماس بگیرید." };
  }

  clearHits(key);
  await startSession(user);
  redirect("/panel");
}

export async function adminLogin(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!hit(`admin:${ip}`, 5, 15 * MINUTE) || !hit("admin:all", 40, 15 * MINUTE)) {
    return { error: "تلاش‌های ناموفق زیاد شد. ۱۵ دقیقه دیگر دوباره امتحان کنید." };
  }
  const admin = db().prepare("SELECT * FROM users WHERE role = 'admin'").get() as User;
  if (!(await verifyPassword(text(form, "password", 200), admin.password_hash))) {
    return { error: "رمز سوپرادمین درست نیست." };
  }
  clearHits(`admin:${ip}`);
  await startSession(admin);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function adminLogout() {
  await endSession();
  redirect("/admin/login");
}
