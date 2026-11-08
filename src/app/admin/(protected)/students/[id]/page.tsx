import Link from "next/link";
import { notFound } from "next/navigation";
import { adjustSubscription, changeStudentTrack, resetStudentPassword, toggleStudentActive } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Heatmap } from "@/components/Heatmap";
import { Ring } from "@/components/ui";
import { requireAdmin, type User } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, faDate, studyTime, toman } from "@/lib/format";
import { getActivity, getExamStates, getTrackProgress, type ExamStatus } from "@/lib/progress";
import { subscriptionState } from "@/lib/subscription";

const EXAM_LABEL: Partial<Record<ExamStatus, [string, string]>> = {
  locked: ["قفل", "badge-quiet"],
  ready: ["آماده", "badge-azure"],
  in_progress: ["در حال انجام", "badge-sun"],
  pending_review: ["منتظر تصحیح", "badge-sun"],
  passed: ["قبول", "badge-grass"],
  failed: ["مردود", "badge-ember"],
};

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const database = db();
  const student = database.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(Number(id)) as User | undefined;
  if (!student) notFound();

  const tracks = database.prepare("SELECT id, title FROM tracks ORDER BY position").all() as { id: number; title: string }[];
  const progress = getTrackProgress(student.id, student.track_id!);
  const exams = getExamStates(student.id, progress.courses);
  const activity = getActivity(student.id);
  const state = subscriptionState(student.subscription_ends_at, Date.now());
  const payments = database.prepare("SELECT * FROM payments WHERE user_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 12").all(student.id) as {
    id: number;
    amount: number;
    reviewed_at: number;
    period_ends_at: number;
  }[];

  return (
    <>
      <Link href="/admin/students" className="text-sm text-ink-soft underline">بازگشت به هنرجوها</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-[2rem] text-marine">{student.full_name}</h1>
          <p className="text-sm text-ink-soft">
            نام کاربری: <span dir="ltr">{student.username}</span>، موبایل: <a href={`tel:${student.phone}`} dir="ltr" className="underline">{student.phone}</a>
          </p>
        </div>
        <Ring value={progress.percent} size={84} stroke={8} label={`${progress.percent} درصد از کل مسیر`}>
          <span className="font-bold">٪{fa(progress.percent)}</span>
        </Ring>
      </div>

      <section className="sheet p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap justify-between gap-2">
          <h2 className="font-bold">چمن فعالیت</h2>
          <p className="text-sm text-ink-soft">{fa(activity.activeDays)} روز فعال، {studyTime(activity.totalSeconds)} مطالعه</p>
        </div>
        <Heatmap days={activity.days} summary={`${activity.activeDays} روز فعال در یک سال گذشته`} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="sheet p-5 sm:p-6">
          <h2 className="mb-3 font-bold">پیشرفت در مسیر</h2>
          <ul className="divide-y divide-line">
            {progress.courses.map((course) => {
              const label = EXAM_LABEL[exams.get(course.id)!.status];
              return (
                <li key={course.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-semibold">{course.title}</span>
                    <span className="ms-2 text-xs text-ink-soft">{fa(course.completedCount)} از {fa(course.videos.length)} ویدیو</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {label && <span className={`badge ${label[1]}`}>آزمون: {label[0]}</span>}
                    <span className="font-bold">٪{fa(course.percent)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="sheet space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="font-bold">اشتراک</h2>
            <p className="text-sm text-ink-soft">
              {state.phase === "active" && `${fa(state.daysLeft)} روز مانده`}
              {state.phase === "grace" && `تمام شده، ${fa(state.graceDaysLeft)} روز تا غیرفعال شدن پنل`}
              {state.phase === "blocked" && "پنل غیرفعال است"}
              {student.subscription_ends_at && `، پایان: ${faDate(student.subscription_ends_at)}`}
            </p>
            <ActionForm action={adjustSubscription} className="mt-2 space-y-2">
              <input type="hidden" name="id" value={student.id} />
              <div className="flex gap-2">
                <input name="days" type="number" required defaultValue={30} aria-label="تعداد روز" className="input w-28" />
                <SubmitButton className="btn btn-quiet">افزودن روز</SubmitButton>
              </div>
              <p className="text-xs text-ink-soft">برای کم کردن از اشتراک، عدد منفی وارد کنید.</p>
            </ActionForm>
          </div>

          <div className="border-t border-line pt-4">
            <ActionForm action={changeStudentTrack} className="space-y-2">
              <input type="hidden" name="id" value={student.id} />
              <label className="field-label" htmlFor="track_id">مسیر هنرجو</label>
              <div className="flex gap-2">
                <select id="track_id" name="track_id" defaultValue={student.track_id ?? undefined} className="input">
                  {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
                </select>
                <SubmitButton className="btn btn-quiet">تغییر مسیر</SubmitButton>
              </div>
            </ActionForm>
          </div>

          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            <ActionForm action={resetStudentPassword} className="space-y-2" confirm="رمز فعلی هنرجو از کار می‌افتد. ادامه می‌دهید؟">
              <input type="hidden" name="id" value={student.id} />
              <SubmitButton className="btn btn-quiet w-full">ساخت رمز جدید</SubmitButton>
            </ActionForm>
            <ActionForm action={toggleStudentActive} className="space-y-2" confirm={student.is_active ? "حساب این هنرجو مسدود شود؟" : "حساب این هنرجو باز شود؟"}>
              <input type="hidden" name="id" value={student.id} />
              <input type="hidden" name="active" value={student.is_active ? 0 : 1} />
              <SubmitButton className={`btn w-full ${student.is_active ? "btn-danger" : "btn-grass"}`}>
                {student.is_active ? "مسدود کردن حساب" : "باز کردن حساب"}
              </SubmitButton>
            </ActionForm>
          </div>

          {payments.length > 0 && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-1 text-sm font-bold">واریزهای تاییدشده</h3>
              <ul className="text-sm text-ink-soft">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between py-1">
                    <span>{faDate(payment.reviewed_at)}</span>
                    <span>{toman(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
