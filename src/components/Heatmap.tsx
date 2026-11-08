"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fa, faDayKey, faMonthOfKey, studyTime } from "@/lib/format";
import type { HeatmapDay } from "@/lib/progress";

const FILLS = ["var(--color-grass-0)", "var(--color-grass-1)", "var(--color-grass-2)", "var(--color-grass-3)", "var(--color-grass-4)"];
const WEEKDAYS = ["شنبه", "", "دوشنبه", "", "چهارشنبه", "", "جمعه"];

export function Heatmap({ days, summary }: { days: HeatmapDay[]; summary: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = -scroller.scrollWidth;
  }, []);

  const columns = days.length ? days[days.length - 1].column + 1 : 0;
  const months = useMemo(() => {
    const labels: { column: number; label: string }[] = [];
    let previous = "";
    for (const day of days) {
      if (day.row !== 0) continue;
      const label = faMonthOfKey(day.key);
      if (label !== previous && day.column < columns - 1) labels.push({ column: day.column, label });
      previous = label;
    }
    return labels;
  }, [days, columns]);

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="w-max" role="img" aria-label={summary}>
          <div className="grid ps-16 text-xs text-ink-soft" style={{ gridTemplateColumns: `repeat(${columns}, 16px)` }} aria-hidden="true">
            {months.map((month) => (
              <span key={`${month.column}-${month.label}`} className="whitespace-nowrap" style={{ gridColumnStart: month.column + 1, gridRowStart: 1 }}>
                {month.label}
              </span>
            ))}
          </div>
          <div className="mt-1 flex">
            <div className="w-16 shrink-0 text-xs text-ink-soft" aria-hidden="true">
              {WEEKDAYS.map((label, index) => (
                <div key={index} className="flex h-4 items-center">{label}</div>
              ))}
            </div>
            <div
              className="grid"
              style={{ gridAutoFlow: "column", gridTemplateRows: "repeat(7, 16px)", gridAutoColumns: "16px" }}
              onMouseLeave={() => setTip(null)}
            >
              {days.map((day) => (
                <span
                  key={day.key}
                  className="size-[13px] rounded-[3px]"
                  style={{ background: FILLS[day.level], gridColumnStart: day.column + 1, gridRowStart: day.row + 1 }}
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setTip({ day, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-ink-soft" aria-hidden="true">
        <span>کمتر</span>
        {FILLS.map((fill) => <span key={fill} className="size-[13px] rounded-[3px]" style={{ background: fill }} />)}
        <span>بیشتر</span>
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-marine px-3 py-1.5 text-xs text-white"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          <div className="font-semibold">{faDayKey(tip.day.key)}</div>
          <div>
            {tip.day.seconds > 0 ? studyTime(tip.day.seconds) : "بدون مطالعه"}
            {tip.day.exams > 0 && `، ${fa(tip.day.exams)} آزمون`}
          </div>
        </div>
      )}
    </div>
  );
}
