/**
 * Fills the database with demonstration data so every screen can be explored.
 * Never run this on the live site.
 *
 * Demo student logins (password for all of them: demo12345):
 *   demo          active subscription, front-end track, a year of activity
 *   demo.grace    subscription ended 4 days ago, inside the 10-day grace period
 *   demo.blocked  grace period is over, panel is disabled
 *   demo.peer1-4  other front-end students, so the leaderboard has competition
 *   demo.peer5    front-end student whose panel is disabled, so it stays off the leaderboard
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db, setSetting, VIDEO_DIR } from "../src/lib/db";
import { addDays, jalaliParts, tehranDay, tehranTimestamp } from "../src/lib/format";
import { hashPasswordSync } from "../src/lib/passwords";
import { DAY_MS } from "../src/lib/subscription";

const database = db();
const now = Date.now();
const hash = hashPasswordSync("demo12345");
const trackId = (slug: string) =>
  (database.prepare("SELECT id FROM tracks WHERE slug = ?").get(slug) as { id: number }).id;
const courseId = (track: number, title: string) =>
  (
    database
      .prepare("SELECT c.id FROM courses c JOIN track_courses tc ON tc.course_id = c.id WHERE tc.track_id = ? AND c.title = ?")
      .get(track, title) as { id: number }
  ).id;

function sampleVideo(seconds: number) {
  const name = `${randomBytes(16).toString("hex")}.mp4`;
  const target = path.join(VIDEO_DIR, name);
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "lavfi", "-i", `testsrc2=size=640x360:rate=15:duration=${seconds}`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "32", "-pix_fmt", "yuv420p", "-movflags", "+faststart", target,
  ]);
  return { name, size: fs.statSync(target).size };
}

function addVideo(course: number, title: string, seconds: number, position: number) {
  const file = sampleVideo(seconds);
  return database
    .prepare(
      `INSERT INTO videos (course_id, title, duration_seconds, file_name, mime_type, file_size, position, created_at)
       VALUES (?, ?, ?, ?, 'video/mp4', ?, ?, ?)`,
    )
    .run(course, title, seconds, file.name, file.size, position, now).lastInsertRowid as number;
}

function addStudent(username: string, fullName: string, phone: string, track: number, endsAt: number) {
  return database
    .prepare(
      `INSERT INTO users (role, username, password_hash, full_name, phone, track_id, subscription_ends_at, created_at)
       VALUES ('student', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(username, hash, fullName, phone, track, endsAt, now - 120 * DAY_MS).lastInsertRowid as number;
}

function markWatched(user: number, video: number, percent: number, seconds: number) {
  const buckets = "1".repeat(percent) + "0".repeat(100 - percent);
  database
    .prepare(
      `INSERT INTO video_progress (user_id, video_id, buckets, percent, watched_seconds, last_position, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(user, video, buckets, percent, seconds, percent >= 90 ? now : null, now);
}

function addPeers() {
  if (database.prepare("SELECT id FROM users WHERE username = 'demo.peer1'").get()) return;
  const videos = database
    .prepare(
      `SELECT v.id FROM videos v JOIN track_courses tc ON tc.course_id = v.course_id
       WHERE tc.track_id = ? ORDER BY tc.position, v.position`,
    )
    .all(trackId("frontend")) as { id: number }[];
  const today = tehranDay(now);
  const insertDay = database.prepare("INSERT INTO activity_days (user_id, day, seconds, exams) VALUES (?, ?, ?, 0)");
  const peers: [string, string, string, number, number, number][] = [
    ["demo.peer1", "مریم کاظمی", "09120000021", 5, 4200, 20],
    ["demo.peer2", "امیر حسینی", "09120000022", 2, 7800, 20],
    ["demo.peer3", "نیلوفر شریفی", "09120000023", 4, 1500, 20],
    ["demo.peer4", "کیان مرادی", "09120000024", 1, 600, 20],
    ["demo.peer5", "پدرام نوری", "09120000025", 6, 9000, -30],
  ];
  for (const [username, name, phone, watched, dailySeconds, daysLeft] of peers) {
    const student = addStudent(username, name, phone, trackId("frontend"), now + daysLeft * DAY_MS);
    videos.slice(0, watched).forEach((video) => markWatched(student, video.id, 100, 1200));
    for (let index = 0; index < 28; index += 3) insertDay.run(student, addDays(today, -index), dailySeconds);
  }
}

function addMeetups() {
  if (database.prepare("SELECT id FROM meetups LIMIT 1").get()) return;
  const insert = database.prepare(
    "INSERT INTO meetups (title, starts_at, location, note, track_id, created_at) VALUES (?, ?, 'تهران، دفتر شرکت (نمایشی)', ?, ?, ?)",
  );
  const at = (daysAhead: number) => {
    const date = jalaliParts(now + daysAhead * DAY_MS);
    return tehranTimestamp(date.year, date.month, date.day, 17, 0);
  };
  insert.run("جلسه حضوری همه مسیرها", at(4), "لپ‌تاپ خود را همراه بیاورید.", null, now);
  insert.run("رفع اشکال ری‌اکت", at(18), "", trackId("frontend"), now);
}

if (database.prepare("SELECT id FROM users WHERE username = 'demo'").get()) {
  addPeers();
  addMeetups();
  console.log("Demo data already exists. Leaderboard students and sessions are in place.");
  process.exit(0);
}

const frontend = trackId("frontend");
const html = courseId(frontend, "HTML و CSS");
const javascript = courseId(frontend, "جاوااسکریپت");
const react = courseId(frontend, "ری‌اکت");

const htmlVideos = [addVideo(html, "ساختار یک صفحه وب", 20, 0), addVideo(html, "چیدمان با Flexbox", 25, 1)];
const jsVideos = [
  addVideo(javascript, "متغیرها و نوع داده", 20, 0),
  addVideo(javascript, "توابع و اسکوپ", 30, 1),
  addVideo(javascript, "کار با آرایه‌ها", 25, 2),
];
addVideo(react, "کامپوننت‌ها و JSX", 20, 0);

const exam = database
  .prepare("INSERT INTO exams (course_id, instructions, time_limit_minutes, pass_percent, is_published) VALUES (?, ?, 30, 70, 1)")
  .run(html, "به سوال‌های تستی پاسخ دهید و برای تمرین عملی کد خود را بنویسید.").lastInsertRowid;
const addQuestion = database.prepare(
  "INSERT INTO questions (exam_id, kind, prompt, options_json, correct_index, points, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
);
addQuestion.run(exam, "mcq", "کدام المان برای ایجاد لینک استفاده می‌شود؟", JSON.stringify(["<link>", "<a>", "<href>", "<url>"]), 1, 2, 0);
addQuestion.run(exam, "mcq", "کدام مقدار display چیدمان انعطاف‌پذیر می‌سازد؟", JSON.stringify(["block", "inline", "flex", "none"]), 2, 2, 1);
addQuestion.run(exam, "practical", "یک کارت پروفایل با HTML و CSS بسازید که تصویر، نام و یک دکمه داشته باشد.", "[]", null, 6, 2);

const demo = addStudent("demo", "سارا احمدی", "09120000001", frontend, now + 17 * DAY_MS);
htmlVideos.forEach((video) => markWatched(demo, video, 100, 1500));
markWatched(demo, jsVideos[0], 100, 1800);
markWatched(demo, jsVideos[1], 46, 900);

const today = tehranDay(now);
const insertDay = database.prepare("INSERT INTO activity_days (user_id, day, seconds, exams) VALUES (?, ?, ?, 0)");
for (let index = 0; index < 300; index += 1) {
  const noise = Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1;
  if (noise < 0.3 && index > 6) continue;
  insertDay.run(demo, addDays(today, -index), Math.round(300 + noise * 8000));
}

const graceStudent = addStudent("demo.grace", "علی رضایی", "09120000002", trackId("backend"), now - 4 * DAY_MS);
const blockedStudent = addStudent("demo.blocked", "نگار موسوی", "09120000003", trackId("devops"), now - 13 * DAY_MS);
database
  .prepare("INSERT INTO payments (user_id, amount, tracking_code, created_at) VALUES (?, 5000000, '348120', ?)")
  .run(graceStudent, now - 3_600_000);
void blockedStudent;

const addApplication = database.prepare(
  "INSERT INTO applications (full_name, phone, track_id, level, weekly_hours, goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
addApplication.run("مهدی کریمی", "09120000011", trackId("ai"), "کمی بلدم", "۱۰ تا ۲۰ ساعت", "می‌خواهم وارد حوزه هوش مصنوعی شوم.", now - 7_200_000, now);
addApplication.run("الهام صادقی", "09120000012", frontend, "بدون تجربه", "۵ تا ۱۰ ساعت", "", now - 90_000_000, now);

addPeers();
addMeetups();

setSetting("card_number", "6037000000000000");
setSetting("card_holder", "کارت نمایشی");
setSetting("card_bank", "بانک نمونه");

console.log("Demo data created.");
