import { describe, expect, it } from "vitest";
import { daysAgoLabel } from "@/lib/format";
import { isInactive } from "@/lib/students";

describe("isInactive", () => {
  const today = "2026-11-20";

  it("counts a student who never studied as inactive", () => {
    expect(isInactive(null, today)).toBe(true);
  });

  it("keeps a student who studied six days ago active", () => {
    expect(isInactive("2026-11-14", today)).toBe(false);
  });

  it("flags a student exactly seven days after the last study", () => {
    expect(isInactive("2026-11-13", today)).toBe(true);
  });
});

describe("daysAgoLabel", () => {
  const now = Date.parse("2026-11-20T10:00:00Z");

  it("uses plain words for recent days", () => {
    expect(daysAgoLabel("2026-11-20", now)).toBe("امروز");
    expect(daysAgoLabel("2026-11-19", now)).toBe("دیروز");
    expect(daysAgoLabel("2026-11-15", now)).toBe("۵ روز پیش");
  });

  it("explains a student with no activity", () => {
    expect(daysAgoLabel(null, now)).toBe("هنوز شروع نکرده");
  });
});
