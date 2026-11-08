import Link from "next/link";
import { ApplyForm } from "@/components/landing/ApplyForm";
import { GrassHill } from "@/components/landing/GrassHill";
import { Logo, LockIcon, Ring } from "@/components/ui";
import { db, getSettings } from "@/lib/db";
import { fa } from "@/lib/format";

const COMPARISON = [
  ["مسیر یادگیری", "خودت حدس می‌زنی چه چیزی را به چه ترتیبی بخوانی.", "مسیر از قبل چیده شده و می‌دانی قدم بعدی چیست."],
  ["وقتی گیر می‌کنی", "ساعت‌ها جست‌وجو و گاهی رها کردن.", "کسی هست که همین راه را رفته و کنار توست."],
  ["سنجش یادگیری", "نمی‌دانی واقعا یاد گرفته‌ای یا نه.", "بعد از هر زبان، آزمون تستی و پروژه عملی."],
  ["انگیزه و نظم", "بعد از چند هفته افت می‌کند.", "فعالیت هر روزت ثبت می‌شود و پیشرفتت پیداست."],
];

const STEPS = [
  ["فرم پیش‌ثبت‌نام را پر کن", "چند دقیقه بیشتر طول نمی‌کشد."],
  ["با تو تماس می‌گیریم", "شرایط دوره را توضیح می‌دهیم و سوال‌هایت را جواب می‌دهیم."],
  ["حساب کاربری‌ات ساخته می‌شود", "نام کاربری و رمز عبور می‌گیری و بعدا می‌توانی عوضشان کنی."],
  ["ویدیوهای مسیرت را ببین", "فقط ویدیوهای حوزه خودت را می‌بینی و درصد پیشرفتت ثبت می‌شود."],
  ["آزمون بده و جلو برو", "پایان هر زبان، یک آزمون تستی و عملی منتظرت است."],
];

const FAQ = [
  ["منتورشیپ با دوره ضبط‌شده چه فرقی دارد؟", "در دوره ضبط‌شده با محتوا تنها می‌مانی. در منتورشیپ مسیر مشخص است، پیشرفتت دنبال می‌شود و بعد از هر زبان با آزمون تستی و عملی سنجیده می‌شوی."],
  ["از صفر می‌توانم شروع کنم؟", "بله. سطح فعلی‌ات را در فرم بنویس تا موقع تماس درباره نقطه شروع مناسب صحبت کنیم."],
  ["می‌توانم به ویدیوهای مسیرهای دیگر هم دسترسی داشته باشم؟", "هر هنرجو فقط به ویدیوهای حوزه خودش دسترسی دارد."],
  ["اگر اشتراکم تمام شود چه می‌شود؟", "تا ۱۰ روز بعد از پایان اشتراک فرصت تمدید داری و پنلت باز می‌ماند. بعد از آن پنل غیرفعال می‌شود و با تایید واریزی دوباره باز خواهد شد."],
  ["پرداخت چطور انجام می‌شود؟", "شهریه را به شماره کارتی که در پنل می‌بینی واریز می‌کنی و دکمه «واریز کردم» را می‌زنی. بعد از تایید ما، اشتراکت تمدید می‌شود."],
];

function SampleHeatmap() {
  const fills = ["#e4edf3", "#b4e8bd", "#62cf7a", "#27a24b", "#116a35"];
  return (
    <div className="grid w-full gap-[3px]" style={{ gridTemplateColumns: "repeat(26, 1fr)", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)" }} aria-hidden="true">
      {Array.from({ length: 182 }, (_, index) => {
        const noise = Math.abs(Math.sin(index * 91.7) * 43758.5) % 1;
        const trend = index / 182;
        const level = noise < 0.25 - trend * 0.18 ? 0 : Math.min(4, Math.floor(noise * 2.4 + trend * 2.6));
        return <span key={index} className="aspect-square rounded-[3px]" style={{ background: fills[level] }} />;
      })}
    </div>
  );
}

export default function LandingPage() {
  const database = db();
  const settings = getSettings();
  const price = Number(settings.monthly_price);
  const tracks = database.prepare("SELECT * FROM tracks ORDER BY position").all() as {
    id: number;
    title: string;
    summary: string;
  }[];
  const courses = database.prepare("SELECT track_id, title FROM courses ORDER BY position, id").all() as {
    track_id: number;
    title: string;
  }[];

  return (
    <>
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[linear-gradient(180deg,#9fd3ff_0%,#d6edff_58%,#effaff_100%)]">
        <div className="absolute inset-x-0 bottom-0 -z-10 h-[38svh] md:h-[62svh]">
          <GrassHill />
        </div>
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 font-medium text-marine md:flex" aria-label="بخش‌های صفحه">
            <a href="#mentorship" className="hover:underline">منتورشیپ چیست</a>
            <a href="#tracks" className="hover:underline">مسیرها</a>
            <a href="#price" className="hover:underline">شهریه</a>
            <a href="#faq" className="hover:underline">سوال‌ها</a>
          </nav>
          <Link href="/login" className="btn btn-quiet btn-sm">ورود هنرجو</Link>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-[6svh] sm:px-6 md:pt-[7svh]">
          <h1 className="display max-w-3xl text-[clamp(3.4rem,10.5vw,7.75rem)] leading-[1.05] text-marine">
            هر روز،
            <br />
            یک خانه سبزتر
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium text-marine">
            برنامه‌نویسی را کنار منتور یاد بگیر. مسیرت را انتخاب می‌کنی، قدم‌به‌قدم جلو می‌روی و هر روز کارت روی
            نقشه‌ات سبز می‌شود.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#apply" className="btn btn-primary min-h-13 px-7 text-base">پیش‌ثبت‌نام</a>
            <a href="#mentorship" className="btn btn-quiet min-h-13 px-7 text-base">منتورشیپ چیست؟</a>
          </div>
        </div>
      </section>

      <main>
        <section id="mentorship" className="scroll-mt-4 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
              <div>
                <h2 className="display text-5xl text-marine">منتورشیپ یعنی تنها نبودن در مسیر</h2>
                <p className="mt-5 text-ink-soft">
                  منتور برنامه‌نویس باتجربه‌ای است که همین راه را قبلا رفته. او به تو نشان می‌دهد چه چیزی را، به چه
                  ترتیبی و تا چه عمقی یاد بگیری و نمی‌گذارد وسط راه گم شوی.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                <div className="grid grid-cols-[1fr_1fr] bg-mist text-sm font-bold sm:grid-cols-[0.8fr_1fr_1fr]">
                  <div className="hidden p-4 sm:block" />
                  <div className="p-4 text-ink-soft">تنها با دوره ضبط‌شده</div>
                  <div className="bg-[#dcf5e1] p-4 text-grass-4">با منتورشیپ</div>
                </div>
                {COMPARISON.map(([topic, alone, mentored]) => (
                  <div key={topic} className="grid grid-cols-[1fr_1fr] border-t border-line sm:grid-cols-[0.8fr_1fr_1fr]">
                    <div className="col-span-2 px-4 pt-4 font-bold sm:col-span-1 sm:p-4">{topic}</div>
                    <div className="p-4 text-sm text-ink-soft">{alone}</div>
                    <div className="bg-[#f0fbf2] p-4 text-sm font-medium">{mentored}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="tracks" className="scroll-mt-4">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="display text-5xl text-marine">چهار مسیر، هرکدام با نقشه خودش</h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              هر مسیر از چند زبان و مهارت پشت‌سرهم ساخته شده. آخر هر مرحله یک آزمون است.
            </p>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {tracks.map((track) => (
                <article key={track.id} className="grid gap-5 py-8 md:grid-cols-[1fr_2fr] md:items-center">
                  <div>
                    <h3 className="display text-4xl text-marine">{track.title}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{track.summary}</p>
                  </div>
                  <ol className="flex flex-wrap items-center gap-y-2">
                    {courses
                      .filter((course) => course.track_id === track.id)
                      .map((course, index, list) => (
                        <li key={course.title} className="flex items-center">
                          <span
                            className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                            style={{
                              background: ["#b4e8bd", "#8ddc9c", "#62cf7a", "#27a24b", "#116a35"][index % 5],
                              color: index >= 3 ? "#fff" : "#10324a",
                            }}
                          >
                            {course.title}
                          </span>
                          {index < list.length - 1 && <span className="h-0.5 w-4 bg-grass-2" aria-hidden="true" />}
                        </li>
                      ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="display text-5xl text-marine">از فرم تا اولین آزمون</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-5 md:items-end md:gap-3">
              {STEPS.map(([title, body], index) => (
                <li key={title} className="flex flex-col">
                  <span className="display text-5xl text-grass-3">{fa(index + 1)}</span>
                  <h3 className="mt-1 font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{body}</p>
                  <div
                    className="mt-4 hidden rounded-lg md:block"
                    style={{
                      height: 24 + index * 44,
                      background: ["#b4e8bd", "#8ddc9c", "#62cf7a", "#27a24b", "#116a35"][index],
                    }}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <h2 className="display text-5xl text-marine">هر روز تلاشت را می‌بینی</h2>
              <p className="mt-5 text-ink-soft">
                هر روزی که درس بخوانی یک خانه از چمن فعالیتت سبز می‌شود. درصد دیده‌شده هر ویدیو، پیشرفت هر زبان و
                جایی که در کل مسیر ایستاده‌ای همیشه جلوی چشمت است.
              </p>
            </div>
            <figure className="sheet p-5 sm:p-7">
              <SampleHeatmap />
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <Ring value={62} size={108} stroke={10} label="۶۲ درصد از کل مسیر">
                  <span className="display text-3xl text-marine">٪{fa(62)}</span>
                </Ring>
                <div>
                  <p className="font-bold">پیشرفت در کل مسیر فرانت‌اند</p>
                  <p className="text-sm text-ink-soft">جاوااسکریپت کامل شده، ری‌اکت در حال انجام</p>
                </div>
              </div>
              <figcaption className="mt-4 text-xs text-ink-soft">نمونه‌ای از پنل هنرجو با داده نمایشی</figcaption>
            </figure>
          </div>
        </section>

        <section id="price" className="scroll-mt-4 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="display text-5xl text-marine">شهریه ماهانه</h2>
            <p className="display mt-6 text-[clamp(3rem,9vw,6rem)] text-grass-4">{fa(price)} تومان</p>
            <p className="max-w-2xl text-ink-soft">ماهانه پرداخت می‌کنی و هر ماه تصمیم می‌گیری ادامه بدهی یا نه.</p>

            <div className="mt-10 flex flex-wrap items-center gap-1" role="img" aria-label="۳۰ روز اشتراک، ۱۰ روز مهلت تمدید، سپس غیرفعال شدن پنل">
              {Array.from({ length: 30 }, (_, index) => (
                <span key={index} className="size-5 rounded bg-grass-3 sm:size-6" />
              ))}
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} className="size-5 rounded bg-sun sm:size-6" />
              ))}
              <span className="ms-1 text-ink-soft"><LockIcon className="size-6" /></span>
            </div>
            <dl className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div><dt className="font-bold">۳۰ روز</dt><dd className="text-sm text-ink-soft">دسترسی کامل به ویدیوها و آزمون‌های مسیرت</dd></div>
              <div><dt className="font-bold">۱۰ روز مهلت</dt><dd className="text-sm text-ink-soft">پنلت باز می‌ماند تا اشتراک را تمدید کنی</dd></div>
              <div><dt className="font-bold">بعد از مهلت</dt><dd className="text-sm text-ink-soft">پنل غیرفعال می‌شود و با تایید واریزی دوباره باز خواهد شد</dd></div>
            </dl>
          </div>
        </section>

        <section id="faq" className="scroll-mt-4">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="display text-5xl text-marine">سوال‌های پرتکرار</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQ.map(([question, answer]) => (
                <details key={question} className="group py-4">
                  <summary className="flex items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                    {question}
                    <span className="text-2xl leading-none text-grass-3 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-2 text-ink-soft">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="scroll-mt-4 bg-marine text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="display text-6xl">اولین خانه را سبز کن</h2>
              <p className="mt-5 text-[#c9dcec]">
                فرم را پر کن. این فرم هنوز ثبت‌نام قطعی نیست و هزینه‌ای ندارد. ما تماس می‌گیریم، شرایط را توضیح
                می‌دهیم و اگر با هم به توافق رسیدیم، حسابت ساخته می‌شود.
              </p>
            </div>
            <ApplyForm tracks={tracks} />
          </div>
        </section>
      </main>

      <footer className="bg-marine-2 text-[#c9dcec]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-6">
          <span>شرکت تجارت الکترونیک شایسته ایرانیان</span>
          {settings.support_phone && <span dir="ltr">{settings.support_phone}</span>}
        </div>
      </footer>
    </>
  );
}
