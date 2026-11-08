import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge, type Tone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { daysAgoLabel, fa, faDate, studyTime } from "@/lib/format";
import { getStudentOverview, INACTIVE_DAYS, type StudentOverview } from "@/lib/students";
import type { SubscriptionPhase } from "@/lib/subscription";

const PHASE_LABEL: Record<SubscriptionPhase, [string, Tone]> = {
  active: ["فعال", "success"],
  grace: ["در مهلت", "warning"],
  blocked: ["پنل غیرفعال", "danger"],
};

const FILTERS: { value: string; label: string; match: (student: StudentOverview) => boolean }[] = [
  { value: "", label: "همه", match: () => true },
  { value: "active", label: "اشتراک فعال", match: (student) => student.state.phase === "active" },
  { value: "grace", label: "در مهلت", match: (student) => student.state.phase === "grace" },
  { value: "blocked", label: "پنل غیرفعال", match: (student) => student.state.phase === "blocked" },
  { value: "inactive", label: `بی‌فعالیت ${fa(INACTIVE_DAYS)} روز`, match: (student) => student.inactive },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ phase?: string; q?: string }> }) {
  await requireAdmin();
  const { phase = "", q = "" } = await searchParams;
  const now = Date.now();
  const all = getStudentOverview(now);
  const filter = FILTERS.find((item) => item.value === phase) ?? FILTERS[0];
  const term = q.trim();
  const students = all
    .filter(filter.match)
    .filter((student) => !term || [student.fullName, student.phone, student.username].some((value) => value.includes(term)));

  return (
    <>
      <PageHeader title="وضعیت هنرجوها" description="پیشرفت، آخرین فعالیت و اشتراک هر هنرجو. برای کنترل حساب روی نام هنرجو بزنید." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button key={item.value} asChild size="sm" variant={filter.value === item.value ? "default" : "outline"}>
              <Link href={`/admin/students${item.value ? `?phase=${item.value}` : ""}`}>{item.label} ({fa(all.filter(item.match).length)})</Link>
            </Button>
          ))}
        </div>
        <form className="flex gap-2">
          {phase && <input type="hidden" name="phase" value={phase} />}
          <Input name="q" defaultValue={q} placeholder="نام، موبایل یا نام کاربری" aria-label="جست‌وجوی هنرجو" className="w-56" />
          <Button type="submit" variant="outline" size="icon" aria-label="جست‌وجو"><SearchIcon /></Button>
        </form>
      </div>
      {students.length === 0 ? (
        <EmptyState title="هنرجویی پیدا نشد" description="فیلتر یا عبارت جست‌وجو را تغییر دهید." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">هنرجو</TableHead>
                <TableHead>الان کجاست</TableHead>
                <TableHead>کل مسیر</TableHead>
                <TableHead>مطالعه ۷ روز</TableHead>
                <TableHead>آخرین فعالیت</TableHead>
                <TableHead>اشتراک</TableHead>
                <TableHead>نیاز به اقدام</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="ps-4">
                    <Link href={`/admin/students/${student.id}`} className="font-medium underline-offset-4 hover:underline">{student.fullName}</Link>
                    <p className="text-xs text-muted-foreground">{student.trackTitle}، <span dir="ltr">{student.phone}</span></p>
                  </TableCell>
                  <TableCell>
                    {student.currentCourse ? (
                      <>
                        <span className="text-sm">{student.currentCourse}</span>
                        <p className="text-xs text-muted-foreground">٪{fa(student.currentCoursePercent)} از این زبان</p>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">{student.percent === 100 ? "مسیر کامل شده" : "ویدیویی نیست"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={student.percent} className="h-1.5 w-20" aria-hidden="true" />
                      <span className="text-sm font-medium">٪{fa(student.percent)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{student.weekSeconds > 0 ? studyTime(student.weekSeconds) : "بدون مطالعه"}</TableCell>
                  <TableCell className="text-sm">{daysAgoLabel(student.lastActiveDay, now)}</TableCell>
                  <TableCell>
                    {student.isActive ? (
                      <StatusBadge tone={PHASE_LABEL[student.state.phase][1]}>{PHASE_LABEL[student.state.phase][0]}</StatusBadge>
                    ) : (
                      <StatusBadge tone="danger">حساب مسدود</StatusBadge>
                    )}
                    {student.endsAt && <p className="mt-1 text-xs text-muted-foreground">تا {faDate(student.endsAt)}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.pendingPayment && <StatusBadge tone="info">واریز منتظر تایید</StatusBadge>}
                      {student.pendingReviews > 0 && <StatusBadge tone="info">آزمون برای تصحیح</StatusBadge>}
                      {student.inactive && <StatusBadge tone="warning">بی‌فعالیت</StatusBadge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
