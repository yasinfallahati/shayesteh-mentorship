import Link from "next/link";
import { notFound } from "next/navigation";
import { approveApplication, updateApplication } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { faDateTime } from "@/lib/format";
import { generatePassword } from "@/lib/passwords";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const database = db();
  const application = database
    .prepare("SELECT a.*, t.title AS track_title FROM applications a JOIN tracks t ON t.id = a.track_id WHERE a.id = ?")
    .get(Number(id)) as
    | {
        id: number;
        full_name: string;
        phone: string;
        track_id: number;
        track_title: string;
        level: string;
        weekly_hours: string;
        goal: string;
        status: string;
        admin_note: string;
        created_at: number;
      }
    | undefined;
  if (!application) notFound();
  const tracks = database.prepare("SELECT id, title FROM tracks ORDER BY position").all() as { id: number; title: string }[];
  const student = database.prepare("SELECT id FROM users WHERE application_id = ?").get(application.id) as { id: number } | undefined;

  const facts = [
    ["مسیر", application.track_title],
    ["سطح فعلی", application.level],
    ["زمان آزاد هفتگی", application.weekly_hours],
    ["تاریخ درخواست", faDateTime(application.created_at)],
  ];

  return (
    <>
      <Link href="/admin/applications" className="text-sm text-ink-soft underline">بازگشت به پیش‌ثبت‌نام‌ها</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-[2rem] text-marine">{application.full_name}</h1>
        <a href={`tel:${application.phone}`} className="btn btn-primary" dir="ltr">{application.phone}</a>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="sheet p-6">
          <dl className="grid grid-cols-2 gap-4">
            {facts.map(([label, value]) => (
              <div key={label}><dt className="text-xs text-ink-soft">{label}</dt><dd className="font-semibold">{value}</dd></div>
            ))}
          </dl>
          {application.goal && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs text-ink-soft">هدف متقاضی</p>
              <p className="whitespace-pre-wrap">{application.goal}</p>
            </div>
          )}

          {application.status !== "accepted" && (
            <ActionForm action={updateApplication} className="mt-5 space-y-3 border-t border-line pt-5">
              <input type="hidden" name="id" value={application.id} />
              <div>
                <label className="field-label" htmlFor="status">وضعیت</label>
                <select id="status" name="status" defaultValue={application.status} className="input">
                  <option value="new">جدید</option>
                  <option value="contacted">تماس گرفته شد</option>
                  <option value="rejected">رد شد</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="admin_note">یادداشت تماس</label>
                <textarea id="admin_note" name="admin_note" defaultValue={application.admin_note} className="input" />
              </div>
              <SubmitButton className="btn btn-quiet">ذخیره وضعیت</SubmitButton>
            </ActionForm>
          )}
        </section>

        <section className="sheet p-6">
          <h2 className="display text-2xl text-marine">تایید و ساخت حساب</h2>
          {application.status === "accepted" ? (
            <p className="mt-2 text-ink-soft">
              برای این متقاضی حساب ساخته شده است.{" "}
              {student && <Link href={`/admin/students/${student.id}`} className="font-bold underline">مشاهده هنرجو</Link>}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">بعد از اینکه متقاضی شرایط را پذیرفت این فرم را ثبت کنید. اشتراک از همین لحظه شروع می‌شود.</p>
              <ActionForm action={approveApplication} className="mt-4 space-y-3" confirm="حساب این هنرجو ساخته شود؟">
                <input type="hidden" name="id" value={application.id} />
                <div>
                  <label className="field-label" htmlFor="username">نام کاربری</label>
                  <input id="username" name="username" required dir="ltr" defaultValue={application.phone} autoComplete="off" className="input" />
                </div>
                <div>
                  <label className="field-label" htmlFor="password">رمز عبور</label>
                  <input id="password" name="password" required dir="ltr" defaultValue={generatePassword()} autoComplete="off" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label" htmlFor="track_id">مسیر</label>
                    <select id="track_id" name="track_id" defaultValue={application.track_id} className="input">
                      {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="months">مدت اشتراک (ماه)</label>
                    <input id="months" name="months" type="number" min={1} max={24} defaultValue={1} required className="input" />
                  </div>
                </div>
                <SubmitButton className="btn btn-grass w-full" pendingLabel="در حال ساخت…">تایید ثبت‌نام و ساخت حساب</SubmitButton>
              </ActionForm>
            </>
          )}
        </section>
      </div>
    </>
  );
}
