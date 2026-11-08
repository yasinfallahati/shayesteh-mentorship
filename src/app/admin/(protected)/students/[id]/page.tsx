import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adjustSubscription, changeStudentTrack, resetStudentPassword, toggleStudentActive } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Heatmap } from "@/components/Heatmap";
import { PageHeader, Ring, StatTile, StatusBadge, type Tone } from "@/components/kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin, type User } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, clock, daysAgoLabel, fa, faDate, faDateTime, studyTime, tehranDay, toman } from "@/lib/format";
import { getActivity, getExamStates, getTrackProgress, type ExamStatus } from "@/lib/progress";
import { subscriptionState } from "@/lib/subscription";

const EXAM_LABEL: Partial<Record<ExamStatus, [string, Tone]>> = {
  locked: ["قفل", "neutral"],
  ready: ["آماده", "info"],
  in_progress: ["در حال انجام", "warning"],
  pending_review: ["منتظر تصحیح", "warning"],
  passed: ["قبول", "success"],
  failed: ["مردود", "danger"],
};

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const database = db();
  const student = database.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(Number(id)) as User | undefined;
  if (!student) notFound();

  const now = Date.now();
  const tracks = database.prepare("SELECT id, title FROM tracks ORDER BY position").all() as { id: number; title: string }[];
  const progress = getTrackProgress(student.id, student.track_id!);
  const exams = getExamStates(student.id, progress.courses);
  const activity = getActivity(student.id, now);
  const state = subscriptionState(student.subscription_ends_at, now);
  const lastActive = (database.prepare("SELECT MAX(day) AS day FROM activity_days WHERE user_id = ?").get(student.id) as { day: string | null }).day;
  const weekStart = addDays(tehranDay(now), -6);
  const weekSeconds = activity.days.filter((day) => day.key >= weekStart).reduce((sum, day) => sum + day.seconds, 0);
  const payments = database.prepare("SELECT * FROM payments WHERE user_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 12").all(student.id) as {
    id: number;
    amount: number;
    reviewed_at: number;
    period_ends_at: number;
  }[];
  const attempts = database
    .prepare(
      `SELECT a.id, a.status, a.percent, a.submitted_at, c.title
       FROM attempts a JOIN exams e ON e.id = a.exam_id JOIN courses c ON c.id = e.course_id
       WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 30`,
    )
    .all(student.id) as { id: number; status: ExamStatus; percent: number | null; submitted_at: number | null; title: string }[];

  return (
    <>
      <PageHeader
        title={student.full_name}
        back={{ href: "/admin/students", label: "بازگشت به وضعیت هنرجوها" }}
        description={
          <>
            نام کاربری: <span dir="ltr">{student.username}</span>، موبایل:{" "}
            <a href={`tel:${student.phone}`} dir="ltr" className="underline underline-offset-4">{student.phone}</a>
          </>
        }
        action={
          <Ring value={progress.percent} size={68} stroke={6} label={`${progress.percent} درصد از کل مسیر`}>
            <span className="text-sm font-bold">٪{fa(progress.percent)}</span>
          </Ring>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="آخرین فعالیت" value={daysAgoLabel(lastActive, now)} />
        <StatTile label="مطالعه ۷ روز اخیر" value={weekSeconds > 0 ? studyTime(weekSeconds) : "بدون مطالعه"} />
        <StatTile label="روزهای پشت‌سرهم" value={fa(activity.streak)} hint={`${fa(activity.activeDays)} روز فعال در سال`} />
        <StatTile label="ویدیوی کامل" value={`${fa(progress.completedCount)} از ${fa(progress.videoCount)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>چمن فعالیت</CardTitle>
          <CardDescription>{fa(activity.activeDays)} روز فعال، {studyTime(activity.totalSeconds)} مطالعه</CardDescription>
        </CardHeader>
        <CardContent><Heatmap days={activity.days} summary={`${activity.activeDays} روز فعال در یک سال گذشته`} /></CardContent>
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>پیشرفت در مسیر</CardTitle>
              <CardDescription>برای دیدن درصد هر ویدیو روی زبان بزنید.</CardDescription>
            </CardHeader>
            <CardContent>
              {progress.courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز زبانی به این مسیر وصل نشده است.</p>
              ) : (
                <Accordion type="multiple">
                  {progress.courses.map((course) => {
                    const label = EXAM_LABEL[exams.get(course.id)!.status];
                    return (
                      <AccordionItem key={course.id} value={String(course.id)}>
                        <AccordionTrigger className="items-center hover:no-underline">
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">{course.title}</span>
                              <span className="flex items-center gap-2 font-normal">
                                {label && <StatusBadge tone={label[1]}>آزمون: {label[0]}</StatusBadge>}
                                <span className="font-semibold">٪{fa(course.percent)}</span>
                              </span>
                            </span>
                            <Progress value={course.percent} className="mt-2 h-1.5" aria-hidden="true" />
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          {course.videos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">ویدیویی برای این زبان آپلود نشده است.</p>
                          ) : (
                            <ul className="grid gap-1">
                              {course.videos.map((video) => (
                                <li key={video.id} className="flex items-center gap-3 text-sm">
                                  <span className="min-w-0 flex-1 truncate">{video.title}</span>
                                  {video.duration > 0 && <span className="text-xs tabular-nums text-muted-foreground">{clock(video.duration)}</span>}
                                  <span className="flex w-14 items-center justify-end gap-1 font-medium">
                                    {video.completed && <CheckIcon className="size-3.5 text-grass-3" aria-label="کامل" />}
                                    ٪{fa(video.percent)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>آزمون‌ها</CardTitle></CardHeader>
            <CardContent>
              {attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز آزمونی نداده است.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>زبان</TableHead><TableHead>زمان</TableHead><TableHead>نمره</TableHead><TableHead>وضعیت</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => {
                      const label = EXAM_LABEL[attempt.status];
                      return (
                        <TableRow key={attempt.id}>
                          <TableCell><Link href={`/admin/reviews/${attempt.id}`} className="underline-offset-4 hover:underline">{attempt.title}</Link></TableCell>
                          <TableCell className="text-muted-foreground">{attempt.submitted_at ? faDateTime(attempt.submitted_at) : ""}</TableCell>
                          <TableCell>{attempt.percent === null ? "" : `٪${fa(attempt.percent)}`}</TableCell>
                          <TableCell>{label && <StatusBadge tone={label[1]}>{label[0]}</StatusBadge>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>کنترل حساب و اشتراک</CardTitle>
            <CardDescription>
              {state.phase === "active" && `${fa(state.daysLeft)} روز مانده`}
              {state.phase === "grace" && `تمام شده، ${fa(state.graceDaysLeft)} روز تا غیرفعال شدن پنل`}
              {state.phase === "blocked" && "پنل غیرفعال است"}
              {student.subscription_ends_at && `، پایان: ${faDate(student.subscription_ends_at)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <ActionForm action={adjustSubscription} className="grid gap-1.5">
              <input type="hidden" name="id" value={student.id} />
              <Label htmlFor="days">تغییر اشتراک (روز)</Label>
              <div className="flex gap-2">
                <Input id="days" name="days" type="number" required defaultValue={30} className="w-28" />
                <SubmitButton variant="outline">افزودن روز</SubmitButton>
              </div>
              <p className="text-xs text-muted-foreground">برای کم کردن از اشتراک، عدد منفی وارد کنید.</p>
            </ActionForm>

            <ActionForm action={changeStudentTrack} className="grid gap-1.5 border-t pt-4">
              <input type="hidden" name="id" value={student.id} />
              <Label htmlFor="track_id">مسیر هنرجو</Label>
              <div className="flex gap-2">
                <NativeSelect id="track_id" name="track_id" defaultValue={student.track_id ?? undefined} className="w-full">
                  {tracks.map((track) => <NativeSelectOption key={track.id} value={track.id}>{track.title}</NativeSelectOption>)}
                </NativeSelect>
                <SubmitButton variant="outline">تغییر مسیر</SubmitButton>
              </div>
            </ActionForm>

            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <ActionForm action={resetStudentPassword} className="grid gap-2" confirm="رمز جدید ساخته شود؟" confirmDetail="رمز فعلی هنرجو از کار می‌افتد و از همه دستگاه‌ها خارج می‌شود.">
                <input type="hidden" name="id" value={student.id} />
                <SubmitButton variant="outline" className="w-full">ساخت رمز جدید</SubmitButton>
              </ActionForm>
              <ActionForm action={toggleStudentActive} className="grid gap-2" confirm={student.is_active ? "حساب این هنرجو مسدود شود؟" : "حساب این هنرجو باز شود؟"}>
                <input type="hidden" name="id" value={student.id} />
                <input type="hidden" name="active" value={student.is_active ? 0 : 1} />
                <SubmitButton variant={student.is_active ? "destructive" : "default"} className="w-full">
                  {student.is_active ? "مسدود کردن حساب" : "باز کردن حساب"}
                </SubmitButton>
              </ActionForm>
            </div>

            {payments.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="mb-1 text-sm font-semibold">واریزهای تاییدشده</h3>
                <ul className="text-sm text-muted-foreground">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex justify-between py-1">
                      <span>{faDate(payment.reviewed_at)}</span>
                      <span>{toman(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
