import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteVideo, moveVideo, updateCourse, updateVideo } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { VideoUploader } from "@/components/VideoUploader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clock, fa } from "@/lib/format";

export default async function CourseAdminPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAdmin();
  const { courseId } = await params;
  const database = db();
  const course = database
    .prepare("SELECT c.*, t.title AS track_title FROM courses c JOIN tracks t ON t.id = c.track_id WHERE c.id = ?")
    .get(Number(courseId)) as { id: number; track_id: number; title: string; description: string; track_title: string } | undefined;
  if (!course) notFound();
  const videos = database.prepare("SELECT * FROM videos WHERE course_id = ? ORDER BY position, id").all(course.id) as {
    id: number;
    title: string;
    description: string;
    duration_seconds: number;
    file_size: number;
  }[];

  return (
    <>
      <Link href={`/admin/content?track=${course.track_id}`} className="text-sm text-ink-soft underline">بازگشت به مسیر {course.track_title}</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-[2rem] text-marine">{course.title}</h1>
        <Link href={`/admin/content/${course.id}/exam`} className="btn btn-primary">سوال‌ها و آزمون این بخش</Link>
      </div>

      <section className="sheet p-5">
        <h2 className="mb-3 font-bold">افزودن ویدیو</h2>
        <VideoUploader courseId={course.id} />
      </section>

      <section className="mt-5">
        <h2 className="mb-2 font-bold">ویدیوها ({fa(videos.length)})</h2>
        {videos.length === 0 ? (
          <p className="sheet p-5 text-sm text-ink-soft">هنوز ویدیویی برای این بخش آپلود نشده است.</p>
        ) : (
          <ul className="sheet divide-y divide-line">
            {videos.map((video, index) => (
              <li key={video.id} className="p-4">
                <details className="group">
                  <summary className="flex flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 font-semibold">{fa(index + 1)}. {video.title}</span>
                    <span className="text-xs text-ink-soft">
                      {video.duration_seconds > 0 && `${clock(video.duration_seconds)}، `}
                      {fa(Math.round(video.file_size / 1048576))} مگابایت
                    </span>
                    <span className="text-sm text-azure underline">ویرایش</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={updateVideo} className="space-y-3">
                      <input type="hidden" name="id" value={video.id} />
                      <div>
                        <label className="field-label" htmlFor={`title-${video.id}`}>عنوان</label>
                        <input id={`title-${video.id}`} name="title" defaultValue={video.title} required className="input" />
                      </div>
                      <div>
                        <label className="field-label" htmlFor={`desc-${video.id}`}>توضیح زیر ویدیو</label>
                        <textarea id={`desc-${video.id}`} name="description" defaultValue={video.description} className="input" />
                      </div>
                      <SubmitButton className="btn btn-quiet btn-sm">ذخیره ویدیو</SubmitButton>
                    </ActionForm>
                    <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
                      <ActionForm action={moveVideo} className="">
                        <input type="hidden" name="id" value={video.id} />
                        <input type="hidden" name="direction" value="-1" />
                        <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="…">بالا</SubmitButton>
                      </ActionForm>
                      <ActionForm action={moveVideo} className="">
                        <input type="hidden" name="id" value={video.id} />
                        <input type="hidden" name="direction" value="1" />
                        <SubmitButton className="btn btn-quiet btn-sm" pendingLabel="…">پایین</SubmitButton>
                      </ActionForm>
                      <a href={`/api/videos/${video.id}/stream`} target="_blank" rel="noreferrer" className="btn btn-quiet btn-sm">پخش</a>
                      <ActionForm action={deleteVideo} className="" confirm={`ویدیوی «${video.title}» برای همیشه حذف شود؟`}>
                        <input type="hidden" name="id" value={video.id} />
                        <SubmitButton className="btn btn-danger btn-sm" pendingLabel="…">حذف ویدیو</SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sheet mt-5 p-5">
        <h2 className="mb-3 font-bold">اطلاعات بخش</h2>
        <ActionForm action={updateCourse} className="space-y-3">
          <input type="hidden" name="id" value={course.id} />
          <div>
            <label className="field-label" htmlFor="title">نام بخش</label>
            <input id="title" name="title" defaultValue={course.title} required className="input" />
          </div>
          <div>
            <label className="field-label" htmlFor="description">توضیح کوتاه</label>
            <textarea id="description" name="description" defaultValue={course.description} className="input" />
          </div>
          <SubmitButton className="btn btn-quiet">ذخیره بخش</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
