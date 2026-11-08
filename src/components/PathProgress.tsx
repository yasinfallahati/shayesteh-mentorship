"use client";

import { useState } from "react";
import { fa } from "@/lib/format";
import { Ring } from "./ui";

export function PathProgress({
  overall,
  trackTitle,
  courses,
}: {
  overall: number;
  trackTitle: string;
  courses: { id: number; title: string; percent: number }[];
}) {
  const [selected, setSelected] = useState("all");
  const value = selected === "all" ? overall : courses.find((course) => String(course.id) === selected)?.percent ?? 0;
  return (
    <div className="flex h-full flex-col items-center text-center">
      <h2 className="display text-2xl text-marine">پیشرفت مسیر یادگیری</h2>
      <label className="sr-only" htmlFor="path-select">انتخاب بخش</label>
      <select id="path-select" value={selected} onChange={(event) => setSelected(event.target.value)} className="input mt-3 max-w-56 text-center text-sm font-semibold">
        <option value="all">کل مسیر {trackTitle}</option>
        {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
      </select>
      <div className="mt-5">
        <Ring value={value} size={190} stroke={15} label={`${value} درصد پیشرفت`}>
          <span className="display text-6xl text-marine">٪{fa(value)}</span>
        </Ring>
      </div>
    </div>
  );
}
