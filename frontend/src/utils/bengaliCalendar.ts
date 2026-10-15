// The Bangladesh national calendar (বঙ্গাব্দ), as revised by Bangla Academy
// in 2019: 1 Boishakh is always 14 April; Boishakh to Ashwin have 31 days,
// Kartik to Magh 30, Falgun 29 (30 when that February is a Gregorian leap
// year), Chaitra 30. Sources (checked 2026-10-15): Wikipedia "Bangladeshi
// national calendar"; Dhaka Tribune, "Ashshin in 31 days in revised Bangla
// calendar" (16 Oct 2019). West Bengal's calendar can differ by a day; it is
// not this one.
//
// Always written in Bangla (digits and month names), in either app language,
// so it never looks like the Gregorian or Hijri date beside it. Pure: no
// storage, no i18n, so the static pages can use it too.

export interface BengaliDate {
  /** Bangabda year (BS), e.g. 1433 */
  year: number;
  /** 1 = Boishakh ... 12 = Chaitra */
  month: number;
  day: number;
}

export const BENGALI_MONTHS = [
  'বৈশাখ',
  'জ্যৈষ্ঠ',
  'আষাঢ়',
  'শ্রাবণ',
  'ভাদ্র',
  'আশ্বিন',
  'কার্তিক',
  'অগ্রহায়ণ',
  'পৌষ',
  'মাঘ',
  'ফাল্গুন',
  'চৈত্র',
] as const;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Bangla digits for a number or a string with ASCII digits ("2026" -> "২০২৬"). */
export function bnDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

const DAY = 86_400_000;
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Days in a Bengali month; `gregorianStartYear` is the year of its 14 April. */
function monthLengths(gregorianStartYear: number): number[] {
  const falgun = isLeap(gregorianStartYear + 1) ? 30 : 29;
  return [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, falgun, 30];
}

/** The Bengali date of a civil day (YYYY-MM-DD). */
export function bengaliDate(ymd: string): BengaliDate {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const startYear = t >= Date.UTC(y, 3, 14) ? y : y - 1;
  let rest = Math.round((t - Date.UTC(startYear, 3, 14)) / DAY);
  const lengths = monthLengths(startYear);
  let month = 0;
  while (rest >= lengths[month]) rest -= lengths[month++];
  return { year: startYear - 593, month: month + 1, day: rest + 1 };
}

/** Days in a Bengali month (29 to 31). */
export function bengaliMonthLength(year: number, month: number): number {
  return monthLengths(year + 593)[month - 1];
}

/** "৩০ আশ্বিন ১৪৩৩ বঙ্গাব্দ" */
export function formatBengaliDate(b: BengaliDate): string {
  return `${bnDigits(b.day)} ${BENGALI_MONTHS[b.month - 1]} ${bnDigits(b.year)} বঙ্গাব্দ`;
}
