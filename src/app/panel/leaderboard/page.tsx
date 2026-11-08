import { TrophyIcon } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireOpenStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { fa, studyTime } from "@/lib/format";
import { byPath, byRecent, getLeaderboard, RECENT_DAYS, rankEntries, type LeaderboardEntry, type Ranked } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

type Row = Ranked<LeaderboardEntry>;

function RankChip({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold",
        rank === 1 ? "bg-pine text-white" : rank <= 3 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {rank === 1 ? <TrophyIcon className="size-4 text-grass-2" aria-label="نفر اول" /> : fa(rank)}
    </span>
  );
}

function Board({
  rows,
  meId,
  bar,
  value,
  detail,
}: {
  rows: Row[];
  meId: number;
  bar: (row: Row) => number;
  value: (row: Row) => string;
  detail: (row: Row) => string;
}) {
  return (
    <ol className="divide-y rounded-xl border bg-card">
      {rows.map((row) => (
        <li
          key={row.id}
          aria-current={row.id === meId ? "true" : undefined}
          className={cn("flex items-center gap-3 p-3 sm:px-4", row.id === meId && "bg-accent/60")}
        >
          <RankChip rank={row.rank} />
          <Avatar className="hidden sm:flex">
            <AvatarFallback>{row.name[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium">
              <span className="truncate">{row.name}</span>
              {row.id === meId && <StatusBadge tone="success">تو</StatusBadge>}
            </p>
            <p className="text-xs text-muted-foreground">{detail(row)}</p>
          </div>
          <Progress value={bar(row)} className="hidden h-1.5 w-40 sm:block" aria-hidden="true" />
          <span className="w-24 shrink-0 text-end text-sm font-semibold">{value(row)}</span>
        </li>
      ))}
    </ol>
  );
}

function Standing({ rows, meId, gap }: { rows: Row[]; meId: number; gap: (ahead: Row, me: Row) => string }) {
  const index = rows.findIndex((row) => row.id === meId);
  const me = rows[index];
  const ahead = rows.slice(0, index).reverse().find((row) => row.rank < me.rank);
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl bg-pine px-5 py-4 text-white">
      <p className="text-lg font-bold">
        رتبه {fa(me.rank)} از {fa(rows.length)}
      </p>
      <p className="text-sm text-[#d3e6dd]">{ahead ? gap(ahead, me) : "الان از همه جلوتری. نگذار کسی بهت برسد."}</p>
    </div>
  );
}

export default async function LeaderboardPage() {
  const user = await requireOpenStudent();
  const track = db().prepare("SELECT title FROM tracks WHERE id = ?").get(user.track_id) as { title: string };
  const entries = getLeaderboard(user.track_id!);
  const pathRows = rankEntries(entries, byPath);
  const recentRows = rankEntries(entries, byRecent);
  const recentMax = Math.max(1, ...entries.map((entry) => entry.recentSeconds));

  return (
    <>
      <PageHeader title="جدول رقابت" description={`هنرجوهای مسیر ${track.title} را ببین و بفهم کی جلوتر است.`} />
      {entries.length < 2 && (
        <p className="mb-3 rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
          فعلا تنها هنرجوی فعال این مسیر هستی. با آمدن بقیه، رقابت از همین‌جا شروع می‌شود.
        </p>
      )}
      <Tabs defaultValue="path" className="gap-4">
        <TabsList>
          <TabsTrigger value="path">کل مسیر</TabsTrigger>
          <TabsTrigger value="recent">{fa(RECENT_DAYS)} روز اخیر</TabsTrigger>
        </TabsList>
        <TabsContent value="path">
          <Standing
            rows={pathRows}
            meId={user.id}
            gap={(ahead, me) =>
              ahead.percent > me.percent
                ? `٪${fa(ahead.percent - me.percent)} تا رسیدن به ${ahead.name}`
                : `با ${ahead.name} هم‌درصدی. آزمون بیشتر یا مطالعه بیشتر جلویت می‌اندازد.`
            }
          />
          <Board
            rows={pathRows}
            meId={user.id}
            bar={(row) => row.percent}
            value={(row) => `٪${fa(row.percent)}`}
            detail={(row) => `${fa(row.passedExams)} آزمون قبول‌شده`}
          />
        </TabsContent>
        <TabsContent value="recent">
          <Standing
            rows={recentRows}
            meId={user.id}
            gap={(ahead, me) =>
              ahead.recentSeconds > me.recentSeconds
                ? `${studyTime(ahead.recentSeconds - me.recentSeconds)} مطالعه تا رسیدن به ${ahead.name}`
                : `با ${ahead.name} هم‌زمان مطالعه کرده‌ای. با پیشرفت بیشتر جلو می‌زنی.`
            }
          />
          <Board
            rows={recentRows}
            meId={user.id}
            bar={(row) => (row.recentSeconds / recentMax) * 100}
            value={(row) => (row.recentSeconds > 0 ? studyTime(row.recentSeconds) : "بدون مطالعه")}
            detail={(row) => `٪${fa(row.percent)} از کل مسیر`}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
