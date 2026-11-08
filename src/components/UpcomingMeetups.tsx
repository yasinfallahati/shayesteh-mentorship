import { ClockIcon, MapPinIcon } from "lucide-react";
import { daysUntilLabel, fa, faMeetupDay, faMeetupTime, jalaliParts, JALALI_MONTHS } from "@/lib/format";
import type { Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export function UpcomingMeetups({ meetups, now }: { meetups: Meetup[]; now: number }) {
  if (meetups.length === 0) return null;
  return (
    <section className="mt-4" aria-label="جلسات حضوری پیش رو">
      <h2 className="mb-2 text-base font-semibold">جلسات حضوری پیش رو</h2>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {meetups.map((meetup, index) => {
          const date = jalaliParts(meetup.starts_at);
          const next = index === 0;
          return (
            <li key={meetup.id} className={cn("flex gap-4 rounded-xl border p-4", next ? "border-transparent bg-pine text-white" : "bg-card")}>
              <div className={cn("grid size-16 shrink-0 place-content-center rounded-lg text-center", next ? "bg-white/10" : "bg-accent text-accent-foreground")}>
                <p className="text-2xl font-bold leading-tight">{fa(date.day)}</p>
                <p className="text-xs leading-tight">{JALALI_MONTHS[date.month - 1]}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{meetup.title}</p>
                  <span className={cn("shrink-0 rounded-md px-2 text-xs font-medium leading-6", next ? "bg-grass-2 text-pine" : "bg-muted text-muted-foreground")}>
                    {daysUntilLabel(meetup.starts_at, now)}
                  </span>
                </div>
                <div className={cn("mt-1 grid gap-0.5 text-sm", next ? "text-[#d3e6dd]" : "text-muted-foreground")}>
                  <p className="flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    {faMeetupDay(meetup.starts_at)}، ساعت {faMeetupTime(meetup.starts_at)}
                  </p>
                  <p className="flex items-start gap-1.5">
                    <MapPinIcon className="mt-1.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>{meetup.location}</span>
                  </p>
                  {meetup.note && <p className="mt-1 whitespace-pre-wrap">{meetup.note}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
