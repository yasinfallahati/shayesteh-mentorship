import type { User } from "./auth";
import { db } from "./db";
import { addDays, tehranDay } from "./format";
import { getTrackProgress } from "./progress";
import { subscriptionState, type SubscriptionState } from "./subscription";

export const INACTIVE_DAYS = 7;

export interface StudentOverview {
  id: number;
  fullName: string;
  phone: string;
  username: string;
  trackTitle: string;
  isActive: boolean;
  endsAt: number | null;
  state: SubscriptionState;
  percent: number;
  currentCourse: string | null;
  currentCoursePercent: number;
  lastActiveDay: string | null;
  weekSeconds: number;
  pendingPayment: boolean;
  pendingReviews: number;
  /** An open account that has not studied for INACTIVE_DAYS or more. */
  inactive: boolean;
}

export function isInactive(lastActiveDay: string | null, today: string) {
  return !lastActiveDay || lastActiveDay <= addDays(today, -INACTIVE_DAYS);
}

export function getStudentOverview(now = Date.now()): StudentOverview[] {
  const today = tehranDay(now);
  const rows = db()
    .prepare(
      `SELECT u.*, t.title AS track_title,
         (SELECT MAX(d.day) FROM activity_days d WHERE d.user_id = u.id) AS last_day,
         COALESCE((SELECT SUM(d.seconds) FROM activity_days d WHERE d.user_id = u.id AND d.day >= @since), 0) AS week_seconds,
         EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'pending') AS pending_payment,
         (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id AND a.status = 'pending_review') AS pending_reviews
       FROM users u JOIN tracks t ON t.id = u.track_id
       WHERE u.role = 'student' ORDER BY u.created_at DESC`,
    )
    .all({ since: addDays(today, -6) }) as (User & {
    track_title: string;
    last_day: string | null;
    week_seconds: number;
    pending_payment: number;
    pending_reviews: number;
  })[];

  return rows.map((row) => {
    const progress = getTrackProgress(row.id, row.track_id!);
    const current = progress.courses.find((course) => course.videos.length > 0 && !course.allVideosDone);
    const state = subscriptionState(row.subscription_ends_at, now);
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      username: row.username,
      trackTitle: row.track_title,
      isActive: Boolean(row.is_active),
      endsAt: row.subscription_ends_at,
      state,
      percent: progress.percent,
      currentCourse: current?.title ?? null,
      currentCoursePercent: current?.percent ?? 0,
      lastActiveDay: row.last_day,
      weekSeconds: row.week_seconds,
      pendingPayment: Boolean(row.pending_payment),
      pendingReviews: row.pending_reviews,
      inactive: Boolean(row.is_active) && state.phase !== "blocked" && isInactive(row.last_day, today),
    };
  });
}
