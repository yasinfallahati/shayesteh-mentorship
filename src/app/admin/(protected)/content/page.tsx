import Link from "next/link";
import { addCourse, deleteCourse, moveCourse } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa } from "@/lib/format";

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  await requireAdmin();
  const { track } = await searchParams;
  const database = db();
  const tracks = database.prepare("SELECT id, title FROM tracks ORDER BY position").all() as { id: number; title: string }[];
  const currentId = tracks.find((item) => item.id === Number(track))?.id ?? tracks[0].id;
  const courses = database
    .prepare(
      `SELECT c.id, c.title, c.description,
              (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) AS videos,
              (SELECT COUNT(*) FROM questions q JOIN exams e ON e.id = q.exam_id WHERE e.course_id = c.id) AS questions,
              (SELECT is_published FROM exams e WHERE e.course_id = c.id) AS published
       FROM courses c WHERE c.track_id = ? ORDER BY c.position, c.id`,
    )
    .all(currentId) as { id: number; title: string; description: string; videos: number; questions: number; published: number | null }[];

  return (
    <>
      <PageTitle title="محتوا و آزمون" hint="هر مسیر از چند بخش (مثلا هر زبان برنامه‌نویسی) تشکیل شده و هر بخش ویدیوها و آزمون خودش را دارد." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tracks.map((item) => (
          <Link key={item.id} href={`/admin/content?track=${item.id}`} className={`btn btn-sm ${item.id === currentId ? "bg-marine text-white" : "btn-quiet"}`}>
            {item.title}
          </Link>
        ))}
      </div>

      <ul className="space-y-2">
        {courses.map((course, index) => (
          <li key={course.id} className="sheet flex flex-wrap items-center justify-between gap-3 p-4">
            <Link href={`/admin/content/${course.id}`} className="min-w-0 flex-1">
              <span className="font-bold underline-offset-4 hover:underline">{fa(index + 1)}. {course.title}</span>
              <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-ink-soft">
                <span>{fa(course.videos)} ویدیو</span>
                <span className={`badge ${course.published ? "badge-grass" : "badge-quiet"}`}>
                  {course.published ? `آزمون منتشرشده، ${fa(course.questions)} سوال` : "آزمون منتشر نشده"}
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <ActionForm action={moveCourse} className="">
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="direction" value="-1" />
                <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="…"><span aria-label="بردن به بالا">بالا</span></SubmitButton>
              </ActionForm>
              <ActionForm action={moveCourse} className="">
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="direction" value="1" />
                <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="…"><span aria-label="بردن به پایین">پایین</span></SubmitButton>
              </ActionForm>
              <ActionForm action={deleteCourse} className="" confirm={`بخش «${course.title}» با همه ویدیوها، آزمون و نمره‌هایش برای همیشه حذف شود؟`}>
                <input type="hidden" name="id" value={course.id} />
                <SubmitButton className="btn btn-danger btn-sm" pendingLabel="…">حذف</SubmitButton>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>

      <section className="sheet mt-5 p-5">
        <h2 className="mb-3 font-bold">افزودن بخش جدید</h2>
        <ActionForm action={addCourse} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <input type="hidden" name="track_id" value={currentId} />
          <div>
            <label className="field-label" htmlFor="title">نام بخش</label>
            <input id="title" name="title" required minLength={2} className="input" />
          </div>
          <div>
            <label className="field-label" htmlFor="description">توضیح کوتاه (اختیاری)</label>
            <input id="description" name="description" className="input" />
          </div>
          <SubmitButton>افزودن بخش</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
