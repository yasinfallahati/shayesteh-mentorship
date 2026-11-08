"use client";

import { submitApplication } from "@/app/actions/public";
import { FormMessage, FormPending, SubmitButton, useFormAction } from "@/components/forms";

const LEVELS = ["بدون تجربه", "کمی بلدم", "پروژه کوچک ساخته‌ام", "شاغل در حوزه نرم‌افزار"];
const HOURS = ["کمتر از ۵ ساعت", "۵ تا ۱۰ ساعت", "۱۰ تا ۲۰ ساعت", "بیشتر از ۲۰ ساعت"];

export function ApplyForm({ tracks }: { tracks: { id: number; title: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(submitApplication);

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-white p-8 text-ink" role="status">
        <div className="mb-4 grid w-fit grid-cols-3 gap-1" aria-hidden="true">
          {["#b4e8bd", "#62cf7a", "#27a24b", "#62cf7a", "#27a24b", "#116a35"].map((color, index) => (
            <span key={index} className="size-5 rounded" style={{ background: color }} />
          ))}
        </div>
        <h3 className="display text-3xl text-marine">
          {state.message === "duplicate" ? "درخواست قبلی شما در صف بررسی است" : "درخواست شما ثبت شد"}
        </h3>
        <p className="mt-2 text-ink-soft">
          برای توضیح شرایط دوره با همین شماره تماس می‌گیریم. اگر شرایط را پذیرفتید، نام کاربری و رمز عبور برایتان
          ساخته می‌شود.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 text-ink sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="full_name">نام و نام خانوادگی</label>
          <input id="full_name" name="full_name" required maxLength={80} autoComplete="name" className="input" />
        </div>
        <div>
          <label className="field-label" htmlFor="phone">شماره موبایل</label>
          <input
            id="phone"
            name="phone"
            required
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09123456789"
            className="input"
          />
        </div>
      </div>

      <fieldset>
        <legend className="field-label">کدام مسیر را می‌خواهید؟</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tracks.map((track, index) => (
            <label
              key={track.id}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-[#c4d5e2] px-2 text-center text-sm font-semibold has-checked:border-grass-3 has-checked:bg-[#dcf5e1] has-checked:text-grass-4 has-focus-visible:outline-3 has-focus-visible:outline-azure"
            >
              <input type="radio" name="track_id" value={track.id} required={index === 0} className="sr-only" />
              {track.title}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="level">سطح فعلی</label>
          <select id="level" name="level" required defaultValue="" className="input">
            <option value="" disabled>انتخاب کنید</option>
            {LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="weekly_hours">زمان آزاد در هفته</label>
          <select id="weekly_hours" name="weekly_hours" required defaultValue="" className="input">
            <option value="" disabled>انتخاب کنید</option>
            {HOURS.map((hours) => <option key={hours}>{hours}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="goal">هدفتان از این دوره چیست؟ (اختیاری)</label>
        <textarea id="goal" name="goal" maxLength={1000} className="input" />
      </div>

      <div className="sr-only" aria-hidden="true">
        <label>
          وب‌سایت
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <FormMessage state={state} />
      <FormPending.Provider value={pending}>
        <SubmitButton className="btn btn-grass w-full" pendingLabel="در حال ثبت…">ثبت پیش‌ثبت‌نام</SubmitButton>
      </FormPending.Provider>
    </form>
  );
}
