const TEHRAN = "Asia/Tehran";

const numberFormat = new Intl.NumberFormat("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "long",
  day: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const monthFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "UTC",
  month: "short",
});
const dayFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});

export const fa = (value: number) => numberFormat.format(value);
export const faDate = (ts: number) => dateFormat.format(ts);
export const faDateTime = (ts: number) => dateTimeFormat.format(ts);
export const toman = (value: number) => `${numberFormat.format(value)} تومان`;

/** Long Persian label for a Tehran calendar key like 2026-11-08. */
export const faDayKey = (key: string) => dayFormat.format(Date.parse(`${key}T00:00:00Z`));
export const faMonthOfKey = (key: string) => monthFormat.format(Date.parse(`${key}T00:00:00Z`));

export function tehranDay(ts: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TEHRAN }).format(ts);
}

export function addDays(key: string, days: number) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Index of a calendar key inside the Iranian week: Saturday 0 ... Friday 6. */
export function weekIndex(key: string) {
  return (new Date(`${key}T00:00:00Z`).getUTCDay() + 1) % 7;
}

export function studyTime(seconds: number) {
  if (seconds > 0 && seconds < 60) return "کمتر از ۱ دقیقه";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${fa(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${fa(hours)} ساعت و ${fa(rest)} دقیقه` : `${fa(hours)} ساعت`;
}

export function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const DAY_MS = 86_400_000;
const TEHRAN_OFFSET_MINUTES = 210;

function persianParts(ts: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(ts);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour"), minute: read("minute") };
}

export const jalaliParts = (ts: number) => persianParts(ts, TEHRAN);

/** Converts a Jalali date and Tehran wall-clock time. Returns null if the date does not exist. */
export function tehranTimestamp(year: number, month: number, day: number, hour: number, minute: number) {
  const start = Date.UTC(year + 621, 0, 1);
  for (let offset = 0; offset < 800; offset += 1) {
    const candidate = start + offset * DAY_MS;
    const parts = persianParts(candidate, "UTC");
    if (parts.year === year && parts.month === month && parts.day === day) {
      return candidate + (hour * 60 + minute - TEHRAN_OFFSET_MINUTES) * 60_000;
    }
  }
  return null;
}

const meetupDayFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: TEHRAN,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const meetupTimeFormat = new Intl.DateTimeFormat("fa-IR", {
  timeZone: TEHRAN,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const faMeetupDay = (ts: number) => meetupDayFormat.format(ts);
export const faMeetupTime = (ts: number) => meetupTimeFormat.format(ts);

export function daysAgoLabel(dayKey: string | null, now: number) {
  if (!dayKey) return "هنوز شروع نکرده";
  const days = Math.round((Date.parse(`${tehranDay(now)}T00:00:00Z`) - Date.parse(`${dayKey}T00:00:00Z`)) / DAY_MS);
  if (days <= 0) return "امروز";
  if (days === 1) return "دیروز";
  return `${fa(days)} روز پیش`;
}

export function daysUntilLabel(ts: number, now: number) {
  const days = Math.round((Date.parse(`${tehranDay(ts)}T00:00:00Z`) - Date.parse(`${tehranDay(now)}T00:00:00Z`)) / DAY_MS);
  if (days <= 0) return "امروز";
  if (days === 1) return "فردا";
  return `${fa(days)} روز دیگر`;
}

export function formatCard(cardNumber: string) {
  return cardNumber.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}
