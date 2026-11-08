import { MapPinIcon, Trash2Icon } from "lucide-react";
import { deleteMeetup, saveMeetup } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, Field, PageHeader, StatusBadge } from "@/components/kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysUntilLabel, fa, faMeetupDay, faMeetupTime, jalaliParts, JALALI_MONTHS } from "@/lib/format";
import { getMeetupsForAdmin, type Meetup } from "@/lib/meetups";
import { DAY_MS } from "@/lib/subscription";

type Track = { id: number; title: string };

function MeetupFields({ meetup, tracks, defaultTs }: { meetup?: Meetup; tracks: Track[]; defaultTs: number }) {
  const prefix = meetup ? `m${meetup.id}` : "new";
  const date = jalaliParts(meetup?.starts_at ?? defaultTs);
  const time = meetup
    ? `${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}`
    : "17:00";
  const currentYear = jalaliParts(Date.now()).year;
  const years = [...new Set([date.year, currentYear, currentYear + 1])].sort();

  return (
    <>
      {meetup && <input type="hidden" name="id" value={meetup.id} />}
      <Field id={`${prefix}-title`} label="عنوان جلسه">
        <Input id={`${prefix}-title`} name="title" required minLength={2} maxLength={120} defaultValue={meetup?.title ?? "جلسه حضوری"} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field id={`${prefix}-day`} label="روز">
          <NativeSelect id={`${prefix}-day`} name="day" defaultValue={date.day} className="w-full">
            {Array.from({ length: 31 }, (_, index) => (
              <NativeSelectOption key={index} value={index + 1}>{fa(index + 1)}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field id={`${prefix}-month`} label="ماه">
          <NativeSelect id={`${prefix}-month`} name="month" defaultValue={date.month} className="w-full">
            {JALALI_MONTHS.map((month, index) => (
              <NativeSelectOption key={month} value={index + 1}>{month}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field id={`${prefix}-year`} label="سال">
          <NativeSelect id={`${prefix}-year`} name="year" defaultValue={date.year} className="w-full">
            {years.map((year) => (
              <NativeSelectOption key={year} value={year}>{new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(year)}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field id={`${prefix}-time`} label="ساعت">
          <Input id={`${prefix}-time`} name="time" type="time" required dir="ltr" defaultValue={time} className="text-left" />
        </Field>
        <Field id={`${prefix}-track`} label="برای کدام مسیر؟">
          <NativeSelect id={`${prefix}-track`} name="track_id" defaultValue={meetup?.track_id ?? ""} className="w-full">
            <NativeSelectOption value="">همه مسیرها</NativeSelectOption>
            {tracks.map((track) => (
              <NativeSelectOption key={track.id} value={track.id}>{track.title}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id={`${prefix}-location`} label="مکان">
        <Input id={`${prefix}-location`} name="location" required minLength={2} maxLength={300} defaultValue={meetup?.location} />
      </Field>
      <Field id={`${prefix}-note`} label="توضیح (اختیاری)">
        <Textarea id={`${prefix}-note`} name="note" maxLength={1000} rows={2} defaultValue={meetup?.note} />
      </Field>
    </>
  );
}

function MeetupRow({ meetup, tracks, defaultTs, now }: { meetup: Meetup; tracks: Track[]; defaultTs: number; now: number }) {
  const trackTitle = tracks.find((track) => track.id === meetup.track_id)?.title ?? "همه مسیرها";
  return (
    <li className="p-4">
      <details>
        <summary className="flex flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 flex-1">
            <span className="font-medium">{meetup.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              <span>{faMeetupDay(meetup.starts_at)}، ساعت {faMeetupTime(meetup.starts_at)}</span>
              <span className="flex items-center gap-1"><MapPinIcon className="size-3.5" aria-hidden="true" />{meetup.location}</span>
            </span>
          </span>
          <StatusBadge tone="neutral">{trackTitle}</StatusBadge>
          {meetup.starts_at >= now && <StatusBadge tone="success">{daysUntilLabel(meetup.starts_at, now)}</StatusBadge>}
          <span className="text-sm font-medium text-primary">ویرایش</span>
        </summary>
        <div className="mt-3 grid gap-3">
          <ActionForm action={saveMeetup} className="grid gap-3">
            <MeetupFields meetup={meetup} tracks={tracks} defaultTs={defaultTs} />
            <SubmitButton variant="outline" size="sm" className="justify-self-start">ذخیره جلسه</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteMeetup} className="" confirm={`«${meetup.title}» حذف شود؟`}>
            <input type="hidden" name="id" value={meetup.id} />
            <SubmitButton variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2Icon aria-hidden="true" />حذف جلسه
            </SubmitButton>
          </ActionForm>
        </div>
      </details>
    </li>
  );
}

export default async function MeetupsPage() {
  await requireAdmin();
  const now = Date.now();
  const tracks = db().prepare("SELECT id, title FROM tracks ORDER BY position").all() as Track[];
  const { upcoming, past } = getMeetupsForAdmin(now);
  const defaultTs = now + 7 * DAY_MS;

  return (
    <>
      <PageHeader title="جلسات حضوری" description="جلسه‌هایی که اینجا ثبت کنید در داشبورد هنرجوهای همان مسیر نمایش داده می‌شوند." />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>افزودن جلسه</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveMeetup} resetOnSuccess className="grid gap-3">
              <MeetupFields tracks={tracks} defaultTs={defaultTs} />
              <SubmitButton className="justify-self-start">ثبت جلسه</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <section>
            <h2 className="mb-2 text-base font-semibold">جلسه‌های پیش رو ({fa(upcoming.length)})</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="جلسه‌ای ثبت نشده است" description="اولین جلسه را از فرم کنار اضافه کنید." />
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {upcoming.map((meetup) => <MeetupRow key={meetup.id} meetup={meetup} tracks={tracks} defaultTs={defaultTs} now={now} />)}
              </ul>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-semibold text-muted-foreground">جلسه‌های گذشته</h2>
              <ul className="divide-y rounded-xl border bg-card opacity-80">
                {past.map((meetup) => <MeetupRow key={meetup.id} meetup={meetup} tracks={tracks} defaultTs={defaultTs} now={now} />)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
