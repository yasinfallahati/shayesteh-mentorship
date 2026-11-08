import { PhoneIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { approveApplication, updateApplication } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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
      <PageHeader
        title={application.full_name}
        back={{ href: "/admin/applications", label: "بازگشت به پیش‌ثبت‌نام‌ها" }}
        action={
          <Button asChild>
            <a href={`tel:${application.phone}`}>
              <PhoneIcon aria-hidden="true" />
              <span dir="ltr">{application.phone}</span>
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader><CardTitle>اطلاعات متقاضی</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              {facts.map(([label, value]) => (
                <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
              ))}
            </dl>
            {application.goal && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-muted-foreground">هدف متقاضی</p>
                <p className="whitespace-pre-wrap">{application.goal}</p>
              </div>
            )}
            {application.status !== "accepted" && (
              <ActionForm action={updateApplication} className="mt-5 grid gap-3 border-t pt-5">
                <input type="hidden" name="id" value={application.id} />
                <Field id="status" label="وضعیت">
                  <NativeSelect id="status" name="status" defaultValue={application.status} className="w-full">
                    <NativeSelectOption value="new">جدید</NativeSelectOption>
                    <NativeSelectOption value="contacted">تماس گرفته شد</NativeSelectOption>
                    <NativeSelectOption value="rejected">رد شد</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field id="admin_note" label="یادداشت تماس">
                  <Textarea id="admin_note" name="admin_note" defaultValue={application.admin_note} />
                </Field>
                <SubmitButton variant="outline" className="justify-self-start">ذخیره وضعیت</SubmitButton>
              </ActionForm>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>تایید و ساخت حساب</CardTitle>
            {application.status !== "accepted" && <CardDescription>بعد از اینکه متقاضی شرایط را پذیرفت این فرم را ثبت کنید. اشتراک از همین لحظه شروع می‌شود.</CardDescription>}
          </CardHeader>
          <CardContent>
            {application.status === "accepted" ? (
              <p className="text-muted-foreground">
                برای این متقاضی حساب ساخته شده است.{" "}
                {student && <Link href={`/admin/students/${student.id}`} className="font-semibold text-foreground underline underline-offset-4">مشاهده هنرجو</Link>}
              </p>
            ) : (
              <ActionForm action={approveApplication} className="grid gap-3" confirm="حساب این هنرجو ساخته شود؟" confirmDetail="اشتراک از همین لحظه شروع می‌شود.">
                <input type="hidden" name="id" value={application.id} />
                <Field id="username" label="نام کاربری">
                  <Input id="username" name="username" required dir="ltr" defaultValue={application.phone} autoComplete="off" className="text-left" />
                </Field>
                <Field id="password" label="رمز عبور">
                  <Input id="password" name="password" required dir="ltr" defaultValue={generatePassword()} autoComplete="off" className="text-left" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="track_id" label="مسیر">
                    <NativeSelect id="track_id" name="track_id" defaultValue={application.track_id} className="w-full">
                      {tracks.map((track) => <NativeSelectOption key={track.id} value={track.id}>{track.title}</NativeSelectOption>)}
                    </NativeSelect>
                  </Field>
                  <Field id="months" label="مدت اشتراک (ماه)">
                    <Input id="months" name="months" type="number" min={1} max={24} defaultValue={1} required />
                  </Field>
                </div>
                <SubmitButton size="lg" className="w-full" pendingLabel="در حال ساخت…">تایید ثبت‌نام و ساخت حساب</SubmitButton>
              </ActionForm>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
