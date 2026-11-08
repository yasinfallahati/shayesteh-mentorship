import Link from "next/link";
import { Heatmap } from "@/components/Heatmap";
import { PathProgress } from "@/components/PathProgress";
import { CheckIcon, LockIcon, Ring } from "@/components/ui";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, faDayKey, studyTime } from "@/lib/format";
import { getActivity, getTrackProgress } from "@/lib/progress";
import { subscriptionState } from "@/lib/subscription";

export default async function DashboardPage() {
  const user = await requireOpenStudent();
  const track = db().prepare("SELECT title FROM tracks WHERE id = ?").get(user.track_id) as { title: string };
  const progress = getTrackProgress(user.id, user.track_id!);
  const activity = getActivity(user.id);
  const state = subscriptionState(user.subscription_ends_at, Date.now());
  const passedExams = (
    db()
      .prepare("SELECT COUNT(DISTINCT exam_id) AS total FROM attempts WHERE user_id = ? AND status = 'passed'")
      .get(user.id) as { total: number }
  ).total;

  const allVideos = progress.courses.flatMap((course) => course.videos);
  const recent = allVideos
    .filter((video) => !video.completed && video.updatedAt)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
  const nextVideo = recent ?? allVideos.find((video) => !video.completed);

  const passedDays = activity.week.filter((day) => !day.isFuture);
  const weekAverage = passedDays.reduce((sum, day) => sum + day.seconds, 0) / Math.max(1, passedDays.length);
  const weekMax = Math.max(1, ...activity.week.map((day) => day.seconds));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-[2rem] text-marine">سلام {user.full_name.split(" ")[0]}</h1>
          <p className="text-sm text-ink-soft">
            مسیر {track.title}
            {state.phase === "active" && `، ${fa(state.daysLeft)} روز تا پایان اشتراک`}
          </p>
        </div>
        {nextVideo && (
          <Link href={`/panel/watch/${nextVideo.id}`} className="btn btn-primary max-w-full">
            <span className="truncate">{recent ? "ادامه" : "شروع"}: {nextVideo.title}</span>
          </Link>
        )}
      </div>

      <section className="sheet p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="display text-2xl text-marine">چمن فعالیت</h2>
          <p className="text-sm text-ink-soft">
            {fa(activity.activeDays)} روز فعال در سال گذشته
            {activity.streak > 0 && `، ${fa(activity.streak)} روز پشت‌سرهم`}
          </p>
        </div>
        <Heatmap
          days={activity.days}
          summary={`${activity.activeDays} روز فعال در یک سال گذشته و ${activity.streak} روز فعالیت پشت‌سرهم`}
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="sheet p-5 sm:p-6">
          <h2 className="display text-2xl text-marine">مطالعه این هفته</h2>
          <p className="text-sm font-medium text-azure">میانگین روزانه: {studyTime(weekAverage)}</p>
          <ul className="mt-4 space-y-2">
            {activity.week.map((day) => (
              <li
                key={day.key}
                className={`relative flex h-10 items-center justify-between overflow-hidden rounded-lg px-3 text-sm ${day.isFuture ? "bg-mist text-ink-soft" : "bg-[#e9f6ec]"}`}
              >
                {!day.isFuture && (
                  <span
                    className="absolute inset-y-0 right-0 bg-grass-1"
                    style={{ width: `${(day.seconds / weekMax) * 100}%` }}
                    aria-hidden="true"
                  />
                )}
                <span className={`relative ${day.isToday ? "font-bold" : ""}`}>{faDayKey(day.key).split(" ")[0].replace("،", "")}</span>
                <span className="relative flex items-center gap-1 font-medium">
                  {day.isFuture ? <LockIcon className="size-3.5" /> : day.seconds > 0 ? studyTime(day.seconds) : "۰"}
                  {!day.isFuture && day.seconds > 0 && <CheckIcon className="size-3.5 text-grass-4" />}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sheet p-5 sm:p-6">
          <h2 className="display text-2xl text-marine">پیشرفت هر بخش</h2>
          {progress.courses.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">هنوز بخشی برای این مسیر ثبت نشده است.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {progress.courses.map((course) => (
                <li key={course.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{course.title}</p>
                    <p className="text-xs text-ink-soft">{studyTime(course.watchedSeconds)} مطالعه</p>
                  </div>
                  <Ring value={course.percent} size={52} stroke={5} label={`${course.title}: ${course.percent} درصد`}>
                    <span className="text-[0.7rem] font-bold">٪{fa(course.percent)}</span>
                  </Ring>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sheet p-5 sm:p-6">
          <PathProgress
            overall={progress.percent}
            trackTitle={track.title}
            courses={progress.courses.map(({ id, title, percent }) => ({ id, title, percent }))}
          />
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
            <div>
              <dd className="display text-2xl text-marine">{fa(progress.completedCount)}</dd>
              <dt className="text-xs text-ink-soft">ویدیو کامل</dt>
            </div>
            <div>
              <dd className="display text-2xl text-marine">{fa(passedExams)}</dd>
              <dt className="text-xs text-ink-soft">آزمون قبول</dt>
            </div>
            <div>
              <dd className="display text-2xl text-marine">{fa(Math.round(activity.totalSeconds / 3600))}</dd>
              <dt className="text-xs text-ink-soft">ساعت مطالعه</dt>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
