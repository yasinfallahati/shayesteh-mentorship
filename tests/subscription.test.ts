import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  GRACE_DAYS,
  PERIOD_DAYS,
  renewedEnd,
  subscriptionState,
} from "@/lib/subscription";

const end = 1_800_000_000_000;

describe("subscriptionState", () => {
  it("is active before the end date", () => {
    const state = subscriptionState(end, end - 3 * DAY_MS);
    expect(state.phase).toBe("active");
    expect(state.daysLeft).toBe(3);
  });

  it("enters grace exactly at the end date", () => {
    const state = subscriptionState(end, end);
    expect(state.phase).toBe("grace");
    expect(state.graceDaysLeft).toBe(GRACE_DAYS);
  });

  it("stays open until the last millisecond of the 10th grace day", () => {
    const state = subscriptionState(end, end + GRACE_DAYS * DAY_MS - 1);
    expect(state.phase).toBe("grace");
    expect(state.graceDaysLeft).toBe(1);
  });

  it("blocks exactly 10 days after the end date", () => {
    expect(subscriptionState(end, end + GRACE_DAYS * DAY_MS).phase).toBe("blocked");
  });

  it("treats a missing end date as blocked", () => {
    expect(subscriptionState(null, end).phase).toBe("blocked");
  });
});

describe("renewedEnd", () => {
  const period = PERIOD_DAYS * DAY_MS;

  it("adds to the end date when renewing early", () => {
    expect(renewedEnd(end, end - 5 * DAY_MS)).toBe(end + period);
  });

  it("continues from the old end date during grace", () => {
    expect(renewedEnd(end, end + 4 * DAY_MS)).toBe(end + period);
  });

  it("starts from today once blocked", () => {
    const now = end + 20 * DAY_MS;
    expect(renewedEnd(end, now)).toBe(now + period);
  });

  it("starts from today for a first subscription", () => {
    expect(renewedEnd(null, end, 2)).toBe(end + 2 * period);
  });
});
