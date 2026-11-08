import { describe, expect, it } from "vitest";
import { byPath, byRecent, rankEntries, type LeaderboardEntry } from "@/lib/leaderboard";

const entry = (id: number, percent: number, passedExams = 0, recentSeconds = 0): LeaderboardEntry => ({
  id,
  name: `student ${id}`,
  percent,
  passedExams,
  recentSeconds,
});

const summary = (list: { id: number; rank: number }[]) => list.map(({ id, rank }) => [id, rank]);

describe("rankEntries", () => {
  it("puts the furthest along first", () => {
    expect(summary(rankEntries([entry(1, 10), entry(2, 80), entry(3, 40)], byPath))).toEqual([
      [2, 1],
      [3, 2],
      [1, 3],
    ]);
  });

  it("breaks equal progress with passed exams, then recent study", () => {
    const list = [entry(1, 50, 1, 100), entry(2, 50, 2, 0), entry(3, 50, 1, 900)];
    expect(summary(rankEntries(list, byPath))).toEqual([
      [2, 1],
      [3, 2],
      [1, 3],
    ]);
  });

  it("gives identical students the same rank and skips the next one", () => {
    const list = [entry(1, 50), entry(2, 50), entry(3, 20)];
    expect(summary(rankEntries(list, byPath))).toEqual([
      [1, 1],
      [2, 1],
      [3, 3],
    ]);
  });

  it("ranks the recent view by study time first", () => {
    const list = [entry(1, 90, 0, 60), entry(2, 10, 0, 6000)];
    expect(summary(rankEntries(list, byRecent))).toEqual([
      [2, 1],
      [1, 2],
    ]);
  });

  it("does not change the input order", () => {
    const list = [entry(1, 10), entry(2, 80)];
    rankEntries(list, byPath);
    expect(list.map((item) => item.id)).toEqual([1, 2]);
  });
});
