import { describe, expect, it } from "vitest";
import { daysUntilLabel, jalaliParts, tehranTimestamp } from "@/lib/format";

describe("tehranTimestamp", () => {
  it("converts a Jalali date and Tehran time", () => {
    expect(tehranTimestamp(1405, 8, 17, 17, 0)).toBe(Date.parse("2026-11-08T13:30:00Z"));
  });

  it("round-trips through jalaliParts", () => {
    const ts = tehranTimestamp(1405, 12, 29, 9, 45)!;
    expect(jalaliParts(ts)).toEqual({ year: 1405, month: 12, day: 29, hour: 9, minute: 45 });
  });

  it("rejects dates that do not exist", () => {
    expect(tehranTimestamp(1405, 7, 31, 10, 0)).toBeNull();
    expect(tehranTimestamp(1404, 12, 30, 10, 0)).toBeNull();
  });

  it("accepts the extra day of a leap year", () => {
    expect(tehranTimestamp(1403, 12, 30, 10, 0)).not.toBeNull();
  });
});

describe("daysUntilLabel", () => {
  const now = Date.parse("2026-11-08T10:00:00Z");

  it("counts Tehran calendar days, not 24-hour periods", () => {
    expect(daysUntilLabel(Date.parse("2026-11-08T19:00:00Z"), now)).toBe("امروز");
    expect(daysUntilLabel(Date.parse("2026-11-08T21:00:00Z"), now)).toBe("فردا");
    expect(daysUntilLabel(Date.parse("2026-11-11T10:00:00Z"), now)).toBe("۳ روز دیگر");
  });
});
