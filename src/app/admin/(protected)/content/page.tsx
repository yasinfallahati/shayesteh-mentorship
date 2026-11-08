import { ArrowDownIcon, ArrowUpIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { addCourse, attachCourseToTrack, deleteCourse, detachCourseFromTrack, moveCourseInTrack, updateCourse } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, PageHeader, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa } from "@/lib/format";

interface CourseRow {
  id: number;
  title: string;
  description: string;
  videos: number;
  questions: number;
  published: number | null;
}

export default async function ContentPage() {
  await requireAdmin();
  const database = db();
  const tracks = database.prepare("SELECT id, title FROM tracks ORDER BY position").all() as { id: number; title: string }[];
  const courses = database
    .prepare(
      `SELECT c.id, c.title, c.description,
              (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) AS videos,
              (SELECT COUNT(*) FROM questions q JOIN exams e ON e.id = q.exam_id WHERE e.course_id = c.id) AS questions,
              (SELECT is_published FROM exams e WHERE e.course_id = c.id) AS published
       FROM courses c ORDER BY c.title`,
    )
    .all() as CourseRow[];
  const links = database.prepare("SELECT track_id, course_id FROM track_courses ORDER BY position").all() as { track_id: number; course_id: number }[];

  const hiddenFields = (trackId: number, courseId: number) => (
    <>
      <input type="hidden" name="track_id" value={trackId} />
      <input type="hidden" name="course_id" value={courseId} />
    </>
  );

  return (
    <>
      <PageHeader title="زبان‌ها و مسیرها" description="هر زبان یک بار ساخته می‌شود. بعد مشخص می‌کنید هر مسیر به کدام زبان‌ها و به چه ترتیبی دسترسی داشته باشد." />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ترتیب زبان‌های هر مسیر</CardTitle>
            <CardDescription>هنرجو زبان‌ها را به همین ترتیب در مسیرش می‌بیند.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={String(tracks[0].id)} className="gap-4">
              <TabsList className="h-auto flex-wrap">
                {tracks.map((track) => <TabsTrigger key={track.id} value={String(track.id)}>{track.title}</TabsTrigger>)}
              </TabsList>
              {tracks.map((track) => {
                const inTrack = links.filter((link) => link.track_id === track.id).map((link) => courses.find((course) => course.id === link.course_id)!);
                const available = courses.filter((course) => !inTrack.some((item) => item.id === course.id));
                return (
                  <TabsContent key={track.id} value={String(track.id)} className="grid gap-3">
                    {inTrack.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">هنوز زبانی به این مسیر وصل نشده است.</p>
                    ) : (
                      <ol className="divide-y rounded-lg border">
                        {inTrack.map((course, index) => (
                          <li key={course.id} className="flex items-center gap-2 p-2.5">
                            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-sm font-semibold text-accent-foreground">{fa(index + 1)}</span>
                            <span className="min-w-0 flex-1 truncate font-medium">{course.title}</span>
                            <ActionForm action={moveCourseInTrack} className="">
                              {hiddenFields(track.id, course.id)}
                              <input type="hidden" name="direction" value="-1" />
                              <SubmitButton variant="ghost" size="icon-sm" aria-label={`بردن ${course.title} به بالا`} disabled={index === 0}><ArrowUpIcon /></SubmitButton>
                            </ActionForm>
                            <ActionForm action={moveCourseInTrack} className="">
                              {hiddenFields(track.id, course.id)}
                              <input type="hidden" name="direction" value="1" />
                              <SubmitButton variant="ghost" size="icon-sm" aria-label={`بردن ${course.title} به پایین`} disabled={index === inTrack.length - 1}><ArrowDownIcon /></SubmitButton>
                            </ActionForm>
                            <ActionForm action={detachCourseFromTrack} className="" confirm={`«${course.title}» از مسیر ${track.title} برداشته شود؟`} confirmDetail="ویدیوها و نمره‌ها پاک نمی‌شوند، ولی هنرجوهای این مسیر دیگر به این زبان دسترسی ندارند.">
                              {hiddenFields(track.id, course.id)}
                              <SubmitButton variant="ghost" size="icon-sm" aria-label={`برداشتن ${course.title} از مسیر`} className="text-destructive hover:text-destructive"><XIcon /></SubmitButton>
                            </ActionForm>
                          </li>
                        ))}
                      </ol>
                    )}
                    {available.length > 0 && (
                      <ActionForm action={attachCourseToTrack} className="flex gap-2">
                        <input type="hidden" name="track_id" value={track.id} />
                        <label className="sr-only" htmlFor={`attach-${track.id}`}>زبان برای افزودن به {track.title}</label>
                        <NativeSelect id={`attach-${track.id}`} name="course_id" required defaultValue="" className="w-full">
                          <NativeSelectOption value="" disabled>افزودن زبان به این مسیر</NativeSelectOption>
                          {available.map((course) => <NativeSelectOption key={course.id} value={course.id}>{course.title}</NativeSelectOption>)}
                        </NativeSelect>
                        <SubmitButton variant="outline">افزودن</SubmitButton>
                      </ActionForm>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>افزودن زبان جدید</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={addCourse} resetOnSuccess className="grid gap-3">
                <Field id="title" label="نام زبان یا مهارت"><Input id="title" name="title" required minLength={2} placeholder="مثلا پایتون" /></Field>
                <Field id="description" label="توضیح کوتاه (اختیاری)"><Input id="description" name="description" /></Field>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium">در کدام مسیرها باشد؟</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {tracks.map((track) => (
                      <label key={track.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="track_ids" value={track.id} className="size-4 accent-[var(--primary)]" />
                        {track.title}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton className="justify-self-start">افزودن زبان</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-2 text-base font-semibold">همه زبان‌ها ({fa(courses.length)})</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {courses.map((course) => {
                const usedIn = tracks.filter((track) => links.some((link) => link.track_id === track.id && link.course_id === course.id));
                return (
                  <li key={course.id} className="p-4">
                    <details>
                      <summary className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{course.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{fa(course.videos)} ویدیو</span>
                            {usedIn.map((track) => <StatusBadge key={track.id} tone="neutral">{track.title}</StatusBadge>)}
                            {usedIn.length === 0 && <StatusBadge tone="warning">در هیچ مسیری نیست</StatusBadge>}
                            <StatusBadge tone={course.published ? "success" : "neutral"}>
                              {course.published ? `آزمون، ${fa(course.questions)} سوال` : "بدون آزمون"}
                            </StatusBadge>
                          </span>
                        </span>
                        <span className="text-sm font-medium text-primary">ویرایش</span>
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <ActionForm action={updateCourse} className="grid gap-3">
                          <input type="hidden" name="id" value={course.id} />
                          <Field id={`title-${course.id}`} label="نام"><Input id={`title-${course.id}`} name="title" defaultValue={course.title} required /></Field>
                          <Field id={`desc-${course.id}`} label="توضیح کوتاه"><Textarea id={`desc-${course.id}`} name="description" defaultValue={course.description} rows={2} /></Field>
                          <SubmitButton variant="outline" size="sm" className="justify-self-start">ذخیره زبان</SubmitButton>
                        </ActionForm>
                        <div className="flex flex-wrap gap-1 border-t pt-3">
                          <Button asChild variant="ghost" size="sm"><Link href={`/admin/content/${course.id}/exam`}>سوال‌ها و آزمون</Link></Button>
                          <ActionForm action={deleteCourse} className="" confirm={`«${course.title}» حذف شود؟`} confirmDetail="این زبان از همه مسیرها برداشته می‌شود و ویدیوها، آزمون و نمره‌هایش برای همیشه پاک می‌شوند.">
                            <input type="hidden" name="id" value={course.id} />
                            <SubmitButton variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2Icon aria-hidden="true" />حذف زبان</SubmitButton>
                          </ActionForm>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
