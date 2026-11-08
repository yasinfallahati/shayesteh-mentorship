import { db } from "./db";

// A session stays on the student's dashboard until two hours after it starts.
const STILL_RUNNING_MS = 2 * 60 * 60 * 1000;

export interface Meetup {
  id: number;
  title: string;
  starts_at: number;
  location: string;
  note: string;
  track_id: number | null;
}

export function getUpcomingMeetups(trackId: number, now = Date.now(), limit = 3) {
  return db()
    .prepare(
      `SELECT * FROM meetups WHERE starts_at >= ? AND (track_id IS NULL OR track_id = ?)
       ORDER BY starts_at LIMIT ?`,
    )
    .all(now - STILL_RUNNING_MS, trackId, limit) as Meetup[];
}

export function getMeetupsForAdmin(now = Date.now()) {
  const rows = db().prepare("SELECT * FROM meetups ORDER BY starts_at").all() as Meetup[];
  const cutoff = now - STILL_RUNNING_MS;
  return {
    upcoming: rows.filter((row) => row.starts_at >= cutoff),
    past: rows.filter((row) => row.starts_at < cutoff).reverse().slice(0, 12),
  };
}
