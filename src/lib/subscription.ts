export const DAY_MS = 86_400_000;
export const PERIOD_DAYS = 30;
export const GRACE_DAYS = 10;

export type SubscriptionPhase = "active" | "grace" | "blocked";

export interface SubscriptionState {
  phase: SubscriptionPhase;
  /** Whole days until the paid period ends (0 once it has ended). */
  daysLeft: number;
  /** Whole days until the panel is disabled (0 once it is blocked). */
  graceDaysLeft: number;
  blocksAt: number | null;
}

export function subscriptionState(
  endsAt: number | null,
  now: number,
): SubscriptionState {
  if (endsAt === null) {
    return { phase: "blocked", daysLeft: 0, graceDaysLeft: 0, blocksAt: null };
  }
  const blocksAt = endsAt + GRACE_DAYS * DAY_MS;
  const daysLeft = Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
  const graceDaysLeft = Math.max(0, Math.ceil((blocksAt - now) / DAY_MS));
  if (now < endsAt) return { phase: "active", daysLeft, graceDaysLeft, blocksAt };
  if (now < blocksAt) return { phase: "grace", daysLeft: 0, graceDaysLeft, blocksAt };
  return { phase: "blocked", daysLeft: 0, graceDaysLeft: 0, blocksAt };
}

/**
 * The new end date after one approved payment. While access is still open the
 * new period continues from the old end date, so paying during the grace days
 * does not hand out free days. After the panel is blocked it starts from today.
 */
export function renewedEnd(
  endsAt: number | null,
  now: number,
  periods = 1,
): number {
  const extension = periods * PERIOD_DAYS * DAY_MS;
  if (endsAt === null) return now + extension;
  const stillOpen = subscriptionState(endsAt, now).phase !== "blocked";
  if (!stillOpen) return now + extension;
  return endsAt + extension;
}
