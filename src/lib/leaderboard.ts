import { db } from "./db";
import { addDays, tehranDay } from "./format";
import { subscriptionState } from "./subscription";

export const RECENT_DAYS = 30;

export interface LeaderboardEntry {
  id: number;
  name: string;
  percent: number;
  passedExams: number;
  recentSeconds: number;
}

export type Ranked<T> = T & { rank: number };
type Key<T> = (entry: T) => number;

export const byPath: Key<LeaderboardEntry>[] = [(e) => e.percent, (e) => e.passedExams, (e) => e.recentSeconds];
export const byRecent: Key<LeaderboardEntry>[] = [(e) => e.recentSeconds, (e) => e.percent];

/** Sorts best first. Entries equal on every key share a rank: 1, 1, 3. */
export function rankEntries<T>(entries: T[], keys: Key<T>[]): Ranked<T>[] {
  const compare = (a: T, b: T) => {
    for (const key of keys) {
      const difference = key(b) - key(a);
      if (difference !== 0) return difference;
    }
    return 0;
  };
  const sorted = [...entries].sort(compare);
  const ranked: Ranked<T>[] = [];
  sorted.forEach((entry, index) => {
    const tied = index > 0 && compare(sorted[index - 1], entry) === 0;
    ranked.push({ ...entry, rank: tied ? ranked[index - 1].rank : index + 1 });
  });
  return ranked;
}

/** Students of one track whose panel is open. Only names leave this function. */
export function getLeaderboard(trackId: number, now = Date.now()): LeaderboardEntry[] {
  const database = db();
  const { total } = database
    .prepare(
      `SELECT COALESCE(SUM(MAX(v.duration_seconds, 60)), 0) AS total
       FROM videos v JOIN track_courses tc ON tc.course_id = v.course_id WHERE tc.track_id = ?`,
    )
    .get(trackId) as { total: number };

  const rows = database
    .prepare(
      `SELECT u.id, u.full_name, u.subscription_ends_at,
         COALESCE((SELECT SUM(MAX(v.duration_seconds, 60) * p.percent)
                   FROM video_progress p
                   JOIN videos v ON v.id = p.video_id
                   JOIN track_courses tc ON tc.course_id = v.course_id
                   WHERE p.user_id = u.id AND tc.track_id = @track), 0) AS earned,
         (SELECT COUNT(DISTINCT a.exam_id)
          FROM attempts a
          JOIN exams e ON e.id = a.exam_id
          JOIN track_courses tc ON tc.course_id = e.course_id
          WHERE a.user_id = u.id AND a.status = 'passed' AND tc.track_id = @track) AS passed,
         COALESCE((SELECT SUM(d.seconds) FROM activity_days d WHERE d.user_id = u.id AND d.day >= @since), 0) AS recent
       FROM users u
       WHERE u.role = 'student' AND u.is_active = 1 AND u.track_id = @track`,
    )
    .all({ track: trackId, since: addDays(tehranDay(now), -(RECENT_DAYS - 1)) }) as {
    id: number;
    full_name: string;
    subscription_ends_at: number | null;
    earned: number;
    passed: number;
    recent: number;
  }[];

  return rows
    .filter((row) => subscriptionState(row.subscription_ends_at, now).phase !== "blocked")
    .map((row) => ({
      id: row.id,
      name: row.full_name,
      percent: total === 0 ? 0 : Math.round(row.earned / total),
      passedExams: row.passed,
      recentSeconds: row.recent,
    }));
}
