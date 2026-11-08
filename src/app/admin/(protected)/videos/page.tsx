import { ArrowDownIcon, ArrowUpIcon, PlayIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { deleteVideo, moveVideo, updateVideo } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, Field, PageHeader, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { VideoUploader } from "@/components/VideoUploader";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clock, fa } from "@/lib/format";

interface VideoRow {
  id: number;
  course_id: number;
  title: string;
  description: string;
  duration_seconds: number;
  file_size: number;
}

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  await requireAdmin();
  const { track } = await searchParams;
  const database = db();
  const tracks = database.prepare("SELECT id, title FROM tracks ORDER BY position").all() as { id: number; title: string }[];
  const courses = database.prepare("SELECT id, title FROM courses ORDER BY title").all() as { id: number; title: string }[];
  const links = database.prepare("SELECT track_id, course_id FROM track_courses ORDER BY position").all() as { track_id: number; course_id: number }[];
  const videos = database.prepare("SELECT * FROM videos ORDER BY position, id").all() as VideoRow[];

  const currentTrack = tracks.find((item) => item.id === Number(track))?.id ?? null;
  const visible = currentTrack
    ? links.filter((link) => link.track_id === currentTrack).map((link) => courses.find((course) => course.id === link.course_id)!)
    : courses;
  const groups = visible
    .map((course) => ({ course, videos: videos.filter((video) => video.course_id === course.id) }))
    .filter((group) => group.videos.length > 0);
  const tracksOf = (courseId: number) =>
    tracks.filter((item) => links.some((link) => link.track_id === item.id && link.course_id === courseId));

  return (
    <>
      <PageHeader title="ویدیوها" description="هر ویدیو به یک زبان تعلق دارد و همه مسیرهایی که آن زبان را دارند آن را می‌بینند." />

      <Card>
        <CardHeader>
          <CardTitle>آپلود ویدیو</CardTitle>
          <CardDescription>
            اگر زبان موردنظر در فهرست نیست، اول آن را در <Link href="/admin/content" className="font-medium text-primary underline underline-offset-4">زبان‌ها و مسیرها</Link> اضافه کنید.
          </CardDescription>
        </CardHeader>
        <CardContent><VideoUploader courses={courses} /></CardContent>
      </Card>

      <div className="mb-3 mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={currentTrack === null ? "default" : "outline"}><Link href="/admin/videos">همه زبان‌ها</Link></Button>
        {tracks.map((item) => (
          <Button key={item.id} asChild size="sm" variant={item.id === currentTrack ? "default" : "outline"}>
            <Link href={`/admin/videos?track=${item.id}`}>{item.title}</Link>
          </Button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState title="ویدیویی پیدا نشد" description="اولین ویدیو را از فرم بالا آپلود کنید." />
      ) : (
        <div className="grid gap-4">
          {groups.map(({ course, videos: list }) => (
            <section key={course.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">{course.title} ({fa(list.length)})</h2>
                {tracksOf(course.id).map((item) => <StatusBadge key={item.id} tone="neutral">{item.title}</StatusBadge>)}
                {tracksOf(course.id).length === 0 && <StatusBadge tone="warning">در هیچ مسیری نیست</StatusBadge>}
              </div>
              <ul className="divide-y rounded-xl border bg-card">
                {list.map((video, index) => (
                  <li key={video.id} className="p-4">
                    <details>
                      <summary className="flex flex-wrap items-center justify-between gap-3">
                        <span className="min-w-0 flex-1 font-medium">{fa(index + 1)}. {video.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {video.duration_seconds > 0 && `${clock(video.duration_seconds)}، `}
                          {fa(Math.round(video.file_size / 1048576))} مگابایت
                        </span>
                        <span className="text-sm font-medium text-primary">ویرایش</span>
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <ActionForm action={updateVideo} className="grid gap-3">
                          <input type="hidden" name="id" value={video.id} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field id={`title-${video.id}`} label="عنوان"><Input id={`title-${video.id}`} name="title" defaultValue={video.title} required /></Field>
                            <Field id={`course-${video.id}`} label="زبان">
                              <NativeSelect id={`course-${video.id}`} name="course_id" defaultValue={video.course_id} className="w-full">
                                {courses.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.title}</NativeSelectOption>)}
                              </NativeSelect>
                            </Field>
                          </div>
                          <Field id={`desc-${video.id}`} label="توضیح زیر ویدیو"><Textarea id={`desc-${video.id}`} name="description" defaultValue={video.description} /></Field>
                          <SubmitButton variant="outline" size="sm" className="justify-self-start">ذخیره ویدیو</SubmitButton>
                        </ActionForm>
                        <div className="flex flex-wrap gap-1 border-t pt-3">
                          <ActionForm action={moveVideo} className="">
                            <input type="hidden" name="id" value={video.id} />
                            <input type="hidden" name="direction" value="-1" />
                            <SubmitButton variant="ghost" size="icon-sm" aria-label="بردن به بالا" disabled={index === 0}><ArrowUpIcon /></SubmitButton>
                          </ActionForm>
                          <ActionForm action={moveVideo} className="">
                            <input type="hidden" name="id" value={video.id} />
                            <input type="hidden" name="direction" value="1" />
                            <SubmitButton variant="ghost" size="icon-sm" aria-label="بردن به پایین" disabled={index === list.length - 1}><ArrowDownIcon /></SubmitButton>
                          </ActionForm>
                          <Button asChild variant="ghost" size="sm">
                            <a href={`/api/videos/${video.id}/stream`} target="_blank" rel="noreferrer"><PlayIcon aria-hidden="true" />پخش</a>
                          </Button>
                          <ActionForm action={deleteVideo} className="" confirm={`ویدیوی «${video.title}» حذف شود؟`} confirmDetail="فایل و پیشرفت هنرجوها در این ویدیو برای همیشه پاک می‌شود.">
                            <input type="hidden" name="id" value={video.id} />
                            <SubmitButton variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2Icon aria-hidden="true" />حذف ویدیو</SubmitButton>
                          </ActionForm>
                        </div>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
