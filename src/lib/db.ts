import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { generatePassword, hashPasswordSync } from "./passwords";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "data");
export const VIDEO_DIR = path.join(DATA_DIR, "videos");
export const MEDIA_DIR = path.join(DATA_DIR, "media");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  track_id INTEGER NOT NULL REFERENCES tracks(id),
  level TEXT NOT NULL,
  weekly_hours TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','accepted','rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS applications_status ON applications(status, created_at);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin','student')),
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  track_id INTEGER REFERENCES tracks(id),
  application_id INTEGER REFERENCES applications(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  subscription_ends_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  tracking_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  period_ends_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending ON payments(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS payments_status ON payments(status, created_at);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS courses_track ON courses(track_id, position);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS videos_course ON videos(course_id, position);

CREATE TABLE IF NOT EXISTS video_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  buckets TEXT NOT NULL,
  percent INTEGER NOT NULL DEFAULT 0,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  last_position REAL NOT NULL DEFAULT 0,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS activity_days (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  exams INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL DEFAULT '',
  time_limit_minutes INTEGER NOT NULL DEFAULT 45,
  pass_percent INTEGER NOT NULL DEFAULT 70,
  is_published INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('mcq','practical')),
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  correct_index INTEGER,
  points INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS questions_exam ON questions(exam_id, position);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_progress','pending_review','passed','failed')),
  started_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  submitted_at INTEGER,
  mcq_earned INTEGER NOT NULL DEFAULT 0,
  mcq_max INTEGER NOT NULL DEFAULT 0,
  practical_earned INTEGER NOT NULL DEFAULT 0,
  practical_max INTEGER NOT NULL DEFAULT 0,
  percent INTEGER,
  reviewer_note TEXT NOT NULL DEFAULT '',
  reviewed_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_open ON attempts(user_id, exam_id) WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS attempts_status ON attempts(status, submitted_at);

CREATE TABLE IF NOT EXISTS answers (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_index INTEGER,
  text_answer TEXT NOT NULL DEFAULT '',
  awarded INTEGER,
  PRIMARY KEY (attempt_id, question_id)
);
`;

const DEFAULT_TRACKS: [string, string, string, string[]][] = [
  [
    "ai",
    "هوش مصنوعی",
    "از پایتون و کار با داده تا ساخت مدل و کار با LLMها.",
    ["پایتون", "کار با داده", "یادگیری ماشین", "یادگیری عمیق", "LLM و عامل‌های هوشمند"],
  ],
  [
    "frontend",
    "فرانت‌اند",
    "ساخت رابط‌های کاربری سریع و تمیز برای وب.",
    ["HTML و CSS", "جاوااسکریپت", "تایپ‌اسکریپت", "ری‌اکت", "نکست‌جی‌اس"],
  ],
  [
    "backend",
    "بک‌اند",
    "طراحی سرویس، API و پایگاه‌داده‌ای که زیر بار بماند.",
    ["Node.js", "پایگاه‌داده و SQL", "طراحی API", "امنیت و احراز هویت", "معماری سرویس‌ها"],
  ],
  [
    "devops",
    "دواپس",
    "استقرار، خودکارسازی و نگهداری سرویس روی سرور واقعی.",
    ["لینوکس", "گیت و CI/CD", "داکر", "کوبرنتیز", "مانیتورینگ"],
  ],
];

const DEFAULT_SETTINGS: Record<string, string> = {
  monthly_price: "5000000",
  card_number: "",
  card_holder: "",
  card_bank: "",
  card_image: "",
  support_phone: "",
};

function migrate(database: Database.Database) {
  database.exec(SCHEMA);
  database
    .transaction(() => {
      const insertSetting = database.prepare(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      );
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(key, value);

      const { count } = database.prepare("SELECT COUNT(*) AS count FROM tracks").get() as {
        count: number;
      };
      if (count === 0) {
        const insertTrack = database.prepare(
          "INSERT INTO tracks (slug, title, summary, position) VALUES (?, ?, ?, ?)",
        );
        const insertCourse = database.prepare(
          "INSERT INTO courses (track_id, title, position) VALUES (?, ?, ?)",
        );
        DEFAULT_TRACKS.forEach(([slug, title, summary, courses], index) => {
          const trackId = insertTrack.run(slug, title, summary, index).lastInsertRowid;
          courses.forEach((course, position) => insertCourse.run(trackId, course, position));
        });
      }

      const admin = database.prepare("SELECT id FROM users WHERE role = 'admin'").get();
      if (!admin) {
        let password = process.env.ADMIN_PASSWORD;
        if (!password) {
          password = generatePassword(16);
          console.warn(`ADMIN_PASSWORD is not set. Generated admin password: ${password}`);
        }
        database
          .prepare(
            "INSERT INTO users (role, username, password_hash, full_name, created_at) VALUES ('admin', 'admin', ?, 'مدیر سامانه', ?)",
          )
          .run(hashPasswordSync(password), Date.now());
      }
    })
    .immediate();
}

const globalForDb = globalThis as unknown as { __mentorDb?: Database.Database };

export function db() {
  if (!globalForDb.__mentorDb) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const database = new Database(path.join(DATA_DIR, "app.db"));
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    migrate(database);
    globalForDb.__mentorDb = database;
  }
  return globalForDb.__mentorDb;
}

export function getSettings() {
  const rows = db().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<
    keyof typeof DEFAULT_SETTINGS,
    string
  >;
}

export function setSetting(key: string, value: string) {
  db()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}
