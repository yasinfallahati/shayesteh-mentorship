import { CalendarDaysIcon, CheckIcon, FlagIcon, PlayIcon, TrophyIcon, XIcon } from "lucide-react";
import { ApplyForm } from "@/components/landing/ApplyForm";
import { HeroField } from "@/components/landing/HeroField";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Logo, Ring } from "@/components/kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db, getSettings } from "@/lib/db";
import { fa } from "@/lib/format";

const COMPARISON = [
  ["مسیر یادگیری", "خودت حدس می‌زنی چه چیزی را به چه ترتیبی بخوانی.", "مسیر از قبل چیده شده و می‌دانی قدم بعدی چیست."],
  ["وقتی گیر می‌کنی", "ساعت‌ها جست‌وجو و گاهی رها کردن.", "کسی هست که همین راه را رفته و کنار توست."],
  ["سنجش یادگیری", "نمی‌دانی واقعا یاد گرفته‌ای یا نه.", "بعد از هر زبان، آزمون تستی و پروژه عملی."],
  ["انگیزه و نظم", "بعد از چند هفته افت می‌کند.", "فعالیت هر روزت ثبت می‌شود و با هم‌مسیرهایت رقابت می‌کنی."],
  ["دیدار حضوری", "فقط خودت هستی و ویدیوها.", "ماهی دو جلسه حضوری کنار منتور و هم‌مسیرها."],
];

const STEPS = [
  ["فرم پیش‌ثبت‌نام را پر کن", "چند دقیقه بیشتر طول نمی‌کشد."],
  ["با تو تماس می‌گیریم", "شرایط دوره را توضیح می‌دهیم و سوال‌هایت را جواب می‌دهیم."],
  ["حساب کاربری می‌گیری", "نام کاربری و رمز عبور می‌گیری و بعدا می‌توانی عوضشان کنی."],
  ["ویدیوهای مسیرت را می‌بینی", "فقط ویدیوهای حوزه خودت را می‌بینی و درصد پیشرفتت ثبت می‌شود."],
  ["آزمون می‌دهی و جلو می‌روی", "پایان هر زبان، یک آزمون تستی و عملی منتظرت است."],
];

const TRACK_DETAILS: Record<string, { about: string; builds: string; fit: string }> = {
  ai: {
    about:
      "هوش مصنوعی یعنی ساختن برنامه‌هایی که به‌جای قانون‌های از پیش نوشته‌شده، از داده یاد می‌گیرند. در این مسیر با پایتون کار با داده را یاد می‌گیری، مدل می‌سازی و مدل‌های زبانی را به محصول واقعی وصل می‌کنی.",
    builds: "چت‌بات، سیستم پیشنهاددهنده، تشخیص تصویر و عامل‌های هوشمند",
    fit: "به داده و آزمایش علاقه داری و از ریاضی فراری نیستی.",
  },
  frontend: {
    about:
      "فرانت‌اند همان بخشی از نرم‌افزار است که کاربر می‌بیند و با آن کار می‌کند: صفحه‌ها، فرم‌ها، دکمه‌ها و انیمیشن‌ها. برنامه‌نویس فرانت‌اند طرح را به رابطی تبدیل می‌کند که سریع باز شود و روی هر اندازه صفحه درست نمایش داده شود.",
    builds: "وب‌سایت فروشگاهی، پنل مدیریت، داشبورد و اپلیکیشن تحت وب",
    fit: "از دیدن نتیجه کارت روی صفحه لذت می‌بری و به جزئیات ظاهر و تجربه کاربر اهمیت می‌دهی.",
  },
  backend: {
    about:
      "بک‌اند موتور پشت صحنه نرم‌افزار است: ثبت‌نام کاربران، ذخیره اطلاعات، پرداخت و هر کاری که روی سرور انجام می‌شود. برنامه‌نویس بک‌اند سرویس‌هایی می‌سازد که اطلاعات را امن نگه دارند و با زیاد شدن کاربران از کار نیفتند.",
    builds: "API، سیستم ورود و احراز هویت، پایگاه‌داده و سرویس‌های سفارش و پرداخت",
    fit: "حل مسئله‌های منطقی را دوست داری و برایت مهم است سیستم درست و پایدار کار کند.",
  },
  devops: {
    about:
      "دواپس پلی است بین نوشتن نرم‌افزار و اجرای آن روی سرور. مهندس دواپس کاری می‌کند که کد جدید خودکار تست و منتشر شود، سرویس‌ها پایدار بمانند و اگر مشکلی پیش آمد زود دیده شود.",
    builds: "خط انتشار خودکار، زیرساخت با داکر و کوبرنتیز و سیستم مانیتورینگ",
    fit: "کار با سرور و خط فرمان را دوست داری و خودکار کردن کارهای تکراری برایت جذاب است.",
  },
};

const FAQ = [
  ["منتورشیپ با دوره ضبط‌شده چه فرقی دارد؟", "در دوره ضبط‌شده با محتوا تنها می‌مانی. در منتورشیپ مسیر مشخص است، پیشرفتت دنبال می‌شود و بعد از هر زبان با آزمون تستی و عملی سنجیده می‌شوی."],
  ["جلسه حضوری هم دارید؟", "بله، ماهی دو بار جلسه حضوری برگزار می‌کنیم تا سوال‌هایت را رو در رو بپرسی و با بقیه هنرجوها آشنا شوی."],
  ["از صفر می‌توانم شروع کنم؟", "بله. سطح فعلی‌ات را در فرم بنویس تا موقع تماس درباره نقطه شروع مناسب صحبت کنیم."],
  ["می‌توانم به ویدیوهای مسیرهای دیگر هم دسترسی داشته باشم؟", "هر هنرجو فقط به ویدیوهای حوزه خودش دسترسی دارد."],
  ["اگر اشتراکم تمام شود چه می‌شود؟", "تا ۱۰ روز بعد از پایان اشتراک فرصت تمدید داری و پنلت باز می‌ماند. بعد از آن پنل غیرفعال می‌شود و با تایید واریزی دوباره باز خواهد شد."],
  ["پرداخت چطور انجام می‌شود؟", "شهریه را به شماره کارتی که در پنل می‌بینی واریز می‌کنی و دکمه «واریز کردم» را می‌زنی. بعد از تایید ما، اشتراکت تمدید می‌شود."],
];

const CELL_FILLS = ["#e9eeeb", "#b7e7c3", "#66cf85", "#25a150", "#116a35"];

function SampleHeatmap({ weeks = 26 }: { weeks?: number }) {
  const total = weeks * 7;
  return (
    <div
      className="grid w-full gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)`, gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)" }}
      aria-hidden="true"
    >
      {Array.from({ length: total }, (_, index) => {
        const noise = Math.abs(Math.sin(index * 91.7) * 43758.5) % 1;
        const trend = index / total;
        const level = noise < 0.25 - trend * 0.18 ? 0 : Math.min(4, Math.floor(noise * 2.4 + trend * 2.6));
        return <span key={index} className="aspect-square rounded-[3px]" style={{ background: CELL_FILLS[level] }} />;
      })}
    </div>
  );
}

function HeroPreview() {
  return (
    <figure className="relative text-foreground">
      <div className="rounded-2xl border border-white/10 bg-white p-5 shadow-[0_30px_80px_-20px_rgba(4,30,22,0.55)] sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">چمن فعالیت</p>
          <p className="text-xs text-muted-foreground">۲۱۵ روز فعال، ۷ روز پشت‌سرهم</p>
        </div>
        <div className="mt-4"><SampleHeatmap /></div>
        <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <Ring value={62} size={92} stroke={8} label="۶۲ درصد از کل مسیر">
            <span className="text-lg font-bold">٪{fa(62)}</span>
          </Ring>
          <ul className="grid gap-2.5 text-sm">
            {[["HTML و CSS", 100], ["جاوااسکریپت", 84], ["ری‌اکت", 22]].map(([title, value]) => (
              <li key={title} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
                <span className="truncate font-medium">{title}</span>
                <Progress value={Number(value)} className="h-1.5" />
                <span className="text-end text-xs text-muted-foreground">٪{fa(Number(value))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 rounded-xl border bg-white p-4 shadow-[0_18px_40px_-14px_rgba(4,30,22,0.45)] sm:absolute sm:-bottom-[5.5rem] sm:-left-6 sm:mt-0 sm:w-72">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">بازخورد آزمون عملی</p>
          <span className="rounded-md bg-success-soft px-2 text-sm font-bold text-success">٪{fa(90)}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">ساختار کامپوننت‌ها تمیز است. فقط حالت خطای فرم را هم مدیریت کن.</p>
      </div>
      <figcaption className="sr-only">نمونه‌ای از پنل هنرجو با داده نمایشی</figcaption>
    </figure>
  );
}

export default function LandingPage() {
  const database = db();
  const settings = getSettings();
  const tracks = database.prepare("SELECT * FROM tracks ORDER BY position").all() as {
    id: number;
    slug: string;
    title: string;
    summary: string;
  }[];
  const courses = database
    .prepare(
      `SELECT tc.track_id, c.title FROM track_courses tc JOIN courses c ON c.id = tc.course_id
       ORDER BY tc.position, c.id`,
    )
    .all() as {
    track_id: number;
    title: string;
  }[];

  return (
    <div className="bg-white">
      <SiteHeader />

      <section className="relative isolate overflow-hidden bg-pine text-white">
        <div className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_left,transparent_32%,black_78%)]">
          <HeroField />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_1.15fr] lg:pb-32 lg:pt-24">
          <div>
            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.3]">برنامه‌نویسی را کنار منتور یاد بگیر</h1>
            <p className="mt-5 max-w-lg text-lg text-[#d3e6dd]">
              مسیرت را انتخاب می‌کنی، قدم‌به‌قدم جلو می‌روی و بعد از هر زبان با آزمون تستی و عملی می‌سنجی که واقعا یاد
              گرفته‌ای.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 bg-white px-7 text-base text-pine hover:bg-mint"><a href="#apply">پیش‌ثبت‌نام</a></Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white"><a href="#tracks">آشنایی با مسیرها</a></Button>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <main>
        <section id="mentorship" className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.7fr] lg:py-28">
            <div>
              <h2 className="text-4xl">منتورشیپ یعنی تنها نبودن در مسیر</h2>
              <p className="mt-5 text-muted-foreground">
                منتور برنامه‌نویس باتجربه‌ای است که همین راه را قبلا رفته. او به تو نشان می‌دهد چه چیزی را، به چه
                ترتیبی و تا چه عمقی یاد بگیری و نمی‌گذارد وسط راه گم شوی.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border">
              <div className="grid grid-cols-2 border-b bg-muted text-sm font-semibold sm:grid-cols-[0.75fr_1fr_1fr]">
                <div className="hidden p-4 sm:block" />
                <div className="p-4 text-muted-foreground">تنها با دوره ضبط‌شده</div>
                <div className="bg-accent p-4 text-accent-foreground">با منتورشیپ</div>
              </div>
              {COMPARISON.map(([topic, alone, mentored], index) => (
                <div key={topic} className={`grid grid-cols-2 sm:grid-cols-[0.75fr_1fr_1fr] ${index ? "border-t" : ""}`}>
                  <div className="col-span-2 px-4 pt-4 font-semibold sm:col-span-1 sm:p-4">{topic}</div>
                  <div className="flex gap-2 p-4 text-sm text-muted-foreground">
                    <XIcon className="mt-1 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                    <span>{alone}</span>
                  </div>
                  <div className="flex gap-2 bg-accent/50 p-4 text-sm">
                    <CheckIcon className="mt-1 size-4 shrink-0 text-grass-3" aria-hidden="true" />
                    <span>{mentored}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tracks" className="scroll-mt-16 border-y bg-background">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="text-4xl">کدام مسیر به تو می‌خورد؟</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              هر مسیر از چند زبان و مهارت پشت‌سرهم ساخته شده و آخر هر مرحله یک آزمون است.
            </p>
            <Tabs defaultValue={tracks[0].slug} className="mt-10 gap-8">
              <div className="overflow-x-auto border-b">
                <TabsList variant="line" className="h-auto w-max gap-4 p-0">
                  {tracks.map((track) => (
                    <TabsTrigger key={track.id} value={track.slug} className="px-3 pb-3 text-base">{track.title}</TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {tracks.map((track) => {
                const detail = TRACK_DETAILS[track.slug];
                const stages = courses.filter((course) => course.track_id === track.id);
                return (
                  <TabsContent key={track.id} value={track.slug}>
                    <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
                      <div>
                        <p className="max-w-2xl text-lg leading-[2]">{detail?.about ?? track.summary}</p>
                        {detail && (
                          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
                            <div className="border-s-2 border-grass-2 ps-4">
                              <dt className="font-semibold">چه چیزهایی می‌سازی</dt>
                              <dd className="mt-1 text-sm text-muted-foreground">{detail.builds}</dd>
                            </div>
                            <div className="border-s-2 border-grass-2 ps-4">
                              <dt className="font-semibold">مناسب توست اگر</dt>
                              <dd className="mt-1 text-sm text-muted-foreground">{detail.fit}</dd>
                            </div>
                          </dl>
                        )}
                      </div>
                      <ol className="rounded-2xl border bg-card p-6" aria-label={`مراحل مسیر ${track.title}`}>
                        {stages.map((stage, index) => (
                          <li key={stage.title} className="relative flex gap-3 pb-5 last:pb-0">
                            {index < stages.length - 1 && <span className="absolute bottom-0 start-[13px] top-7 w-px bg-border" aria-hidden="true" />}
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{fa(index + 1)}</span>
                            <span className="pt-0.5 font-medium">{stage.title}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </section>

        <section id="journey" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="text-4xl">از فرم تا اولین آزمون</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-5">
              {STEPS.map(([title, body], index) => (
                <li key={title} className="relative flex gap-4 md:block">
                  {index < STEPS.length - 1 && <span className="absolute start-[60px] end-0 top-[18px] hidden h-px bg-border md:block" aria-hidden="true" />}
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-pine font-semibold text-white">{fa(index + 1)}</span>
                  <div className="md:mt-4">
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y bg-background">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="text-4xl">هر روز، یک خانه سبزتر</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">پنل هنرجو نشان می‌دهد هر روز چقدر جلو رفته‌ای و قدم بعدی‌ات چیست.</p>
            <div className="mt-10 grid gap-4 lg:grid-cols-6">
              <article className="rounded-2xl border bg-card p-6 lg:col-span-4">
                <h3 className="text-lg font-semibold">چمن فعالیت</h3>
                <p className="mb-5 text-sm text-muted-foreground">هر روزی که درس بخوانی یک خانه سبز می‌شود، مثل گیت‌هاب.</p>
                <SampleHeatmap weeks={36} />
              </article>
              <article className="rounded-2xl border bg-card p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold">درصد هر ویدیو</h3>
                <p className="mb-5 text-sm text-muted-foreground">فقط زمانی که واقعا تماشا کرده‌ای حساب می‌شود.</p>
                <div className="grid aspect-video place-items-center rounded-lg bg-pine">
                  <span className="grid size-12 place-items-center rounded-full bg-white/15"><PlayIcon className="size-5 fill-white text-white" aria-hidden="true" /></span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={68} className="h-1.5" />
                  <span className="text-sm font-semibold">٪{fa(68)}</span>
                </div>
              </article>
              <article className="rounded-2xl border bg-card p-6 lg:col-span-3">
                <h3 className="text-lg font-semibold">آزمون پایان هر زبان</h3>
                <p className="mb-5 text-sm text-muted-foreground">سوال‌های چهارگزینه‌ای و تمرین عملی که منتور تصحیح می‌کند.</p>
                <p className="font-medium">کدام المان برای ساخت لینک استفاده می‌شود؟</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm" dir="ltr">
                  {["<link>", "<a>", "<href>", "<url>"].map((option) => (
                    <li key={option} className={`rounded-lg border px-3 py-2 ${option === "<a>" ? "border-primary bg-accent font-semibold" : ""}`}>{option}</li>
                  ))}
                </ul>
              </article>
              <article className="flex flex-col rounded-2xl border bg-pine p-6 text-white lg:col-span-3">
                <FlagIcon className="size-6 text-grass-2" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold">همیشه می‌دانی کجای راهی</h3>
                <p className="mt-1 text-sm text-[#d3e6dd]">درصد پیشرفت هر زبان و کل مسیر جلوی چشمت است و قدم بعدی را از همان داشبورد شروع می‌کنی.</p>
                <div className="mt-auto flex items-center gap-3 pt-6">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[62%] rounded-full bg-grass-2" /></div>
                  <span className="text-sm font-semibold">٪{fa(62)} از کل مسیر</span>
                </div>
              </article>
              <article className="rounded-2xl border bg-card p-6 lg:col-span-3">
                <div className="flex items-center gap-2">
                  <TrophyIcon className="size-5 text-grass-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">جدول رقابت</h3>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">هر هنرجو می‌بیند بین هم‌مسیرهایش کجا ایستاده و چقدر تا نفر بالاتر فاصله دارد.</p>
                <ol className="grid gap-2 text-sm">
                  {[["سارا", 74], ["تو", 62], ["امیر", 41]].map(([name, value], index) => (
                    <li key={name} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${name === "تو" ? "bg-accent font-semibold" : "bg-muted"}`}>
                      <span className="w-4 font-semibold">{fa(index + 1)}</span>
                      <span className="flex-1">{name}</span>
                      <span>٪{fa(Number(value))}</span>
                    </li>
                  ))}
                </ol>
              </article>
              <article className="rounded-2xl border bg-card p-6 lg:col-span-3">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="size-5 text-grass-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">ماهی دو جلسه حضوری</h3>
                </div>
                <p className="mt-1 text-muted-foreground">
                  آموزش فقط پشت صفحه نمایش نیست. ماهی دو بار دور هم جمع می‌شویم تا سوال‌هایت را رو در رو بپرسی، با منتور صحبت کنی و
                  هم‌مسیرهایت را از نزدیک ببینی.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.7fr] lg:py-28">
            <h2 className="text-4xl">سوال‌های پرتکرار</h2>
            <Accordion type="single" collapsible>
              {FAQ.map(([question, answer]) => (
                <AccordionItem key={question} value={question}>
                  <AccordionTrigger className="text-base">{question}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section id="apply" className="scroll-mt-16 bg-pine text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:py-28">
            <div>
              <h2 className="text-4xl">اولین قدم را بردار</h2>
              <p className="mt-5 text-[#d3e6dd]">
                این فرم هنوز ثبت‌نام قطعی نیست و هزینه‌ای ندارد. ما تماس می‌گیریم، شرایط را توضیح می‌دهیم و اگر با هم
                به توافق رسیدیم، حسابت ساخته می‌شود.
              </p>
            </div>
            <ApplyForm tracks={tracks} />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <Logo />
          <span>شرکت تجارت الکترونیک شایسته ایرانیان</span>
          {settings.support_phone && <span dir="ltr">{settings.support_phone}</span>}
        </div>
      </footer>
    </div>
  );
}
