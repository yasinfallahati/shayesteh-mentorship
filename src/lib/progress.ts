import { db } from "./db";
import { addDays, tehranDay, weekIndex } from "./format";

export const COMPLETE_PERCENT = 90;

export interface VideoRow {
  id: number;
  title: string;
  duration: number;
  percent: number;
  watchedSeconds: number;
  completed: boolean;
  updatedAt: number | null;
}

export interface CourseProgress {
  id: number;
  title: string;
  description: string;
  videos: VideoRow[];
  percent: number;
  watchedSeconds: number;
  completedCount: number;
  allVideosDone: boolean;
}

export interface TrackProgress {
  courses: CourseProgress[];
  percent: number;
  completedCount: number;
  videoCount: number;
}

// Videos whose length is still unknown count as one minute so they keep some weight.
const weight = (video: VideoRow) => Math.max(video.duration, 60);

function weightedPercent(videos: VideoRow[]) {
  const total = videos.reduce((sum, video) => sum + weight(video), 0);
  if (total === 0) return 0;
  const earned = videos.reduce((sum, video) => sum + weight(video) * video.percent, 0);
  return Math.round(earned / total);
}

export function trackHasVideo(trackId: number, videoId: number) {
  return Boolean(
    db()
      .prepare(
        `SELECT 1 FROM videos v JOIN track_courses tc ON tc.course_id = v.course_id
         WHERE v.id = ? AND tc.track_id = ?`,
      )
      .get(videoId, trackId),
  );
}

export function getTrackProgress(userId: number, trackId: number): TrackProgress {
  const rows = db()
    .prepare(
      `SELECT c.id AS course_id, c.title AS course_title, c.description AS course_description,
              v.id AS video_id, v.title AS video_title, v.duration_seconds,
              COALESCE(p.percent, 0) AS percent, COALESCE(p.watched_seconds, 0) AS watched_seconds,
              p.completed_at, p.updated_at
       FROM track_courses tc
       JOIN courses c ON c.id = tc.course_id
       LEFT JOIN videos v ON v.course_id = c.id
       LEFT JOIN video_progress p ON p.video_id = v.id AND p.user_id = ?
       WHERE tc.track_id = ?
       ORDER BY tc.position, c.id, v.position, v.id`,
    )
    .all(userId, trackId) as {
    course_id: number;
    course_title: string;
    course_description: string;
    video_id: number | null;
    video_title: string | null;
    duration_seconds: number | null;
    percent: number;
    watched_seconds: number;
    completed_at: number | null;
    updated_at: number | null;
  }[];

  const byCourse = new Map<number, CourseProgress>();
  for (const row of rows) {
    let course = byCourse.get(row.course_id);
    if (!course) {
      course = {
        id: row.course_id,
        title: row.course_title,
        description: row.course_description,
        videos: [],
        percent: 0,
        watchedSeconds: 0,
        completedCount: 0,
        allVideosDone: false,
      };
      byCourse.set(row.course_id, course);
    }
    if (row.video_id !== null) {
      course.videos.push({
        id: row.video_id,
        title: row.video_title ?? "",
        duration: row.duration_seconds ?? 0,
        percent: row.percent,
        watchedSeconds: row.watched_seconds,
        completed: row.completed_at !== null,
        updatedAt: row.updated_at,
      });
    }
  }

  const courses = [...byCourse.values()];
  for (const course of courses) {
    course.percent = weightedPercent(course.videos);
    course.watchedSeconds = course.videos.reduce((sum, video) => sum + video.watchedSeconds, 0);
    course.completedCount = course.videos.filter((video) => video.completed).length;
    course.allVideosDone = course.videos.length > 0 && course.completedCount === course.videos.length;
  }
  const videos = courses.flatMap((course) => course.videos);
  return {
    courses,
    percent: weightedPercent(videos),
    completedCount: videos.filter((video) => video.completed).length,
    videoCount: videos.length,
  };
}

export interface HeatmapDay {
  key: string;
  seconds: number;
  exams: number;
  level: 0 | 1 | 2 | 3 | 4;
  column: number;
  row: number;
}

function levelFor(seconds: number, exams: number): HeatmapDay["level"] {
  if (seconds >= 90 * 60) return 4;
  if (seconds >= 45 * 60) return 3;
  if (seconds >= 15 * 60) return 2;
  if (seconds > 0 || exams > 0) return 1;
  return 0;
}

export function getActivity(userId: number, now = Date.now()) {
  const today = tehranDay(now);
  const start = addDays(today, -(52 * 7 + weekIndex(today)));
  const rows = db()
    .prepare("SELECT day, seconds, exams FROM activity_days WHERE user_id = ? AND day >= ?")
    .all(userId, start) as { day: string; seconds: number; exams: number }[];
  const byDay = new Map(rows.map((row) => [row.day, row]));

  const days: HeatmapDay[] = [];
  for (let key = start, index = 0; key <= today; key = addDays(key, 1), index += 1) {
    const row = byDay.get(key);
    const seconds = row?.seconds ?? 0;
    const exams = row?.exams ?? 0;
    days.push({
      key,
      seconds,
      exams,
      level: levelFor(seconds, exams),
      column: Math.floor(index / 7),
      row: index % 7,
    });
  }

  let streak = 0;
  let cursor = byDay.has(today) ? today : addDays(today, -1);
  while (byDay.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const weekStart = addDays(today, -weekIndex(today));
  const week = Array.from({ length: 7 }, (_, index) => {
    const key = addDays(weekStart, index);
    return { key, seconds: byDay.get(key)?.seconds ?? 0, isFuture: key > today, isToday: key === today };
  });

  const activeDays = rows.filter((row) => row.seconds > 0 || row.exams > 0).length;
  const totalSeconds = rows.reduce((sum, row) => sum + row.seconds, 0);
  return { days, streak, week, activeDays, totalSeconds };
}

export function recordActivity(
  userId: number,
  change: { seconds?: number; exams?: number },
  now = Date.now(),
) {
  db()
    .prepare(
      `INSERT INTO activity_days (user_id, day, seconds, exams) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, day) DO UPDATE SET
         seconds = seconds + excluded.seconds, exams = exams + excluded.exams`,
    )
    .run(userId, tehranDay(now), change.seconds ?? 0, change.exams ?? 0);
}

export type ExamStatus = "none" | "locked" | "ready" | "in_progress" | "pending_review" | "passed" | "failed";

export interface CourseExam {
  examId: number | null;
  status: ExamStatus;
  percent: number | null;
  attemptId: number | null;
}

/** Exam state per course id. A passed attempt always wins over later retakes. */
export function getExamStates(userId: number, courses: CourseProgress[]) {
  const exams = db()
    .prepare(
      `SELECT e.id, e.course_id FROM exams e
       WHERE e.is_published = 1 AND EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id)`,
    )
    .all() as { id: number; course_id: number }[];
  const examByCourse = new Map(exams.map((exam) => [exam.course_id, exam.id]));
  const attempts = db()
    .prepare("SELECT id, exam_id, status, percent FROM attempts WHERE user_id = ? ORDER BY id DESC")
    .all(userId) as { id: number; exam_id: number; status: ExamStatus; percent: number | null }[];

  const states = new Map<number, CourseExam>();
  for (const course of courses) {
    const examId = examByCourse.get(course.id) ?? null;
    if (examId === null) {
      states.set(course.id, { examId: null, status: "none", percent: null, attemptId: null });
      continue;
    }
    const mine = attempts.filter((attempt) => attempt.exam_id === examId);
    const chosen = mine.find((attempt) => attempt.status === "passed") ?? mine[0];
    if (chosen) {
      states.set(course.id, {
        examId,
        status: chosen.status,
        percent: chosen.percent,
        attemptId: chosen.id,
      });
    } else {
      states.set(course.id, {
        examId,
        status: course.allVideosDone ? "ready" : "locked",
        percent: null,
        attemptId: null,
      });
    }
  }
  return states;
}
