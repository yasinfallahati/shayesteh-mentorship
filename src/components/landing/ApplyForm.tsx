"use client";

import { CheckCircle2Icon } from "lucide-react";
import { submitApplication } from "@/app/actions/public";
import { FormError, FormPending, SubmitButton, useFormAction } from "@/components/forms";
import { Field } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const LEVELS = ["بدون تجربه", "کمی بلدم", "پروژه کوچک ساخته‌ام", "شاغل در حوزه نرم‌افزار"];
const HOURS = ["کمتر از ۵ ساعت", "۵ تا ۱۰ ساعت", "۱۰ تا ۲۰ ساعت", "بیشتر از ۲۰ ساعت"];

export function ApplyForm({ tracks }: { tracks: { id: number; title: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(submitApplication);

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-card p-8 text-card-foreground" role="status">
        <CheckCircle2Icon className="size-9 text-grass-3" aria-hidden="true" />
        <h3 className="mt-4 text-2xl">
          {state.message === "duplicate" ? "درخواست قبلی شما در صف بررسی است" : "درخواست شما ثبت شد"}
        </h3>
        <p className="mt-2 text-muted-foreground">
          برای توضیح شرایط دوره با همین شماره تماس می‌گیریم. اگر شرایط را پذیرفتید، نام کاربری و رمز عبور برایتان
          ساخته می‌شود.
        </p>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-5 rounded-2xl bg-card p-6 text-card-foreground sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="full_name" label="نام و نام خانوادگی">
          <Input id="full_name" name="full_name" required maxLength={80} autoComplete="name" className="h-11" />
        </Field>
        <Field id="phone" label="شماره موبایل">
          <Input id="phone" name="phone" required dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09123456789" className="h-11 text-left" />
        </Field>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">کدام مسیر را می‌خواهید؟</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tracks.map((track, index) => (
            <label
              key={track.id}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-input px-2 text-center text-sm font-medium transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" name="track_id" value={track.id} required={index === 0} className="sr-only" />
              {track.title}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="level" label="سطح فعلی">
          <NativeSelect id="level" name="level" required defaultValue="" className="w-full [&_select]:h-11">
            <NativeSelectOption value="" disabled>انتخاب کنید</NativeSelectOption>
            {LEVELS.map((level) => <NativeSelectOption key={level}>{level}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field id="weekly_hours" label="زمان آزاد در هفته">
          <NativeSelect id="weekly_hours" name="weekly_hours" required defaultValue="" className="w-full [&_select]:h-11">
            <NativeSelectOption value="" disabled>انتخاب کنید</NativeSelectOption>
            {HOURS.map((hours) => <NativeSelectOption key={hours}>{hours}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
      </div>

      <Field id="goal" label="هدفتان از این دوره چیست؟ (اختیاری)">
        <Textarea id="goal" name="goal" maxLength={1000} rows={3} />
      </Field>

      <div className="sr-only" aria-hidden="true">
        <label>
          وب‌سایت
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <FormError message={state.error} />
      <FormPending.Provider value={pending}>
        <SubmitButton size="lg" className="h-11 w-full" pendingLabel="در حال ثبت…">ثبت پیش‌ثبت‌نام</SubmitButton>
      </FormPending.Provider>
    </form>
  );
}
