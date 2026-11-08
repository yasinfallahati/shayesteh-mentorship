"use client";

import { useState } from "react";
import { Ring } from "@/components/kit";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { fa } from "@/lib/format";

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
    <div className="flex flex-col items-center">
      <Ring value={value} size={156} stroke={12} label={`${value} درصد پیشرفت`}>
        <span className="text-4xl font-bold">٪{fa(value)}</span>
      </Ring>
      <label className="sr-only" htmlFor="path-select">انتخاب بخش</label>
      <NativeSelect id="path-select" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-5 w-full max-w-56">
        <NativeSelectOption value="all">کل مسیر {trackTitle}</NativeSelectOption>
        {courses.map((course) => <NativeSelectOption key={course.id} value={course.id}>{course.title}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}
