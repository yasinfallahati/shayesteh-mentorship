import { PlayIcon } from "lucide-react";
import Link from "next/link";
import { Heatmap } from "@/components/Heatmap";
import { PageHeader, StatTile } from "@/components/kit";
import { PathProgress } from "@/components/PathProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UpcomingMeetups } from "@/components/UpcomingMeetups";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, studyTime } from "@/lib/format";
import { byPath, getLeaderboard, rankEntries } from "@/lib/leaderboard";
import { getUpcomingMeetups } from "@/lib/meetups";
import { getActivity, getTrackProgress } from "@/lib/progress";
import { subscriptionState } from "@/lib/subscription";

const WEEK_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

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
  const standings = rankEntries(getLeaderboard(user.track_id!), byPath);
  const myRank = standings.find((entry) => entry.id === user.id)?.rank;

  return (
    <>
      <PageHeader
        title={`سلام ${user.full_name.split(" ")[0]}`}
        description={
          <>
            مسیر {track.title}
            {state.phase === "active" && `، ${fa(state.daysLeft)} روز تا پایان اشتراک`}
            {myRank && (
              <>
                ،{" "}
                <Link href="/panel/leaderboard" className="font-medium text-primary underline-offset-4 hover:underline">
                  رتبه {fa(myRank)} از {fa(standings.length)} در جدول رقابت
                </Link>
              </>
            )}
          </>
        }
        action={
          nextVideo && (
            <Button asChild className="max-w-full">
              <Link href={`/panel/watch/${nextVideo.id}`}>
                <PlayIcon className="fill-current" aria-hidden="true" />
                <span className="truncate">{recent ? "ادامه" : "شروع"}: {nextVideo.title}</span>
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="ساعت مطالعه" value={fa(Math.round(activity.totalSeconds / 3600))} hint="در یک سال گذشته" />
        <StatTile label="روزهای پشت‌سرهم" value={fa(activity.streak)} hint={`${fa(activity.activeDays)} روز فعال در سال`} />
        <StatTile label="ویدیوی کامل" value={`${fa(progress.completedCount)} از ${fa(progress.videoCount)}`} />
        <StatTile label="آزمون قبول‌شده" value={fa(passedExams)} />
      </div>

      <UpcomingMeetups meetups={getUpcomingMeetups(user.track_id!)} now={Date.now()} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>چمن فعالیت</CardTitle>
          <CardDescription>هر خانه یک روز است و رنگ پررنگ‌تر یعنی مطالعه بیشتر.</CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap
            days={activity.days}
            summary={`${activity.activeDays} روز فعال در یک سال گذشته و ${activity.streak} روز فعالیت پشت‌سرهم`}
          />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>پیشرفت مسیر</CardTitle>
          </CardHeader>
          <CardContent>
            <PathProgress
              overall={progress.percent}
              trackTitle={track.title}
              courses={progress.courses.map(({ id, title, percent }) => ({ id, title, percent }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>پیشرفت هر بخش</CardTitle>
          </CardHeader>
          <CardContent>
            {progress.courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز بخشی برای این مسیر ثبت نشده است.</p>
            ) : (
              <ul className="grid gap-4">
                {progress.courses.map((course) => (
                  <li key={course.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{course.title}</span>
                      <span className="text-muted-foreground">٪{fa(course.percent)}</span>
                    </div>
                    <Progress value={course.percent} className="h-1.5" aria-label={`${course.title}: ${course.percent} درصد`} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مطالعه این هفته</CardTitle>
            <CardDescription>میانگین روزانه: {studyTime(weekAverage)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex h-44 items-end gap-2">
              {activity.week.map((day, index) => (
                <li key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex w-full flex-1 items-end" tabIndex={day.isFuture ? undefined : 0}>
                        <div
                          className={`w-full rounded-t-[4px] ${day.isFuture ? "bg-muted" : day.isToday ? "bg-grass-4" : "bg-grass-3"}`}
                          style={{ height: day.isFuture ? 4 : `${Math.max(3, (day.seconds / weekMax) * 100)}%` }}
                        />
                      </div>
                    </TooltipTrigger>
                    {!day.isFuture && <TooltipContent>{WEEK_LABELS[index]}: {day.seconds > 0 ? studyTime(day.seconds) : "بدون مطالعه"}</TooltipContent>}
                  </Tooltip>
                  <span className={`text-xs ${day.isToday ? "font-bold" : "text-muted-foreground"}`}>{WEEK_LABELS[index][0]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
