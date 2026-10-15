import type { TFunction } from 'i18next';
import { BENGALI_MONTHS, bnDigits } from '../../utils/bengaliCalendar.js';
import type { CalendarEvent } from '../../utils/calendarEvents.js';
import type { CalendarDay, CalendarKind } from '../../utils/calendarMonth.js';
import type { HijriYmd } from '../../utils/hijriOffset.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { ymdNoon } from '../../utils/placeClock.js';

// Words and numbers of the Islamic calendar screen. The Bengali calendar is
// always written in Bangla (digits and month names), in either app language.

export type Lang = 'en' | 'bn';

export const num = (n: number | string, lang: Lang) => (lang === 'bn' ? bnDigits(n) : String(n));

/** Arabic Hijri month names (shown with lang="ar"). */
export const HIJRI_MONTHS_AR = [
  'مُحَرَّم',
  'صَفَر',
  'رَبِيع الأَوَّل',
  'رَبِيع الآخِر',
  'جُمَادَى الأُولَى',
  'جُمَادَى الآخِرَة',
  'رَجَب',
  'شَعْبَان',
  'رَمَضَان',
  'شَوَّال',
  'ذُو القَعْدَة',
  'ذُو الحِجَّة',
] as const;

export const hijriMonthName = (t: TFunction, month: number) => t(`hijriMonths.${month - 1}`);

/** "3 Jumādā al-Ūlā 1448 AH" in the app language. */
export const hijriLabel = (t: TFunction, h: HijriYmd, lang: Lang) =>
  `${num(h.day, lang)} ${hijriMonthName(t, h.month)} ${num(h.year, lang)} ${t('hijriMonths.ah')}`;

/** "৩০ আশ্বিন ১৪৩৩ বঙ্গাব্দ" */
export const bengaliLabel = (d: CalendarDay) =>
  `${bnDigits(d.bengali.day)} ${BENGALI_MONTHS[d.bengali.month - 1]} ${bnDigits(d.bengali.year)} বঙ্গাব্দ`;

export const gregLabel = (ymd: string, options: Intl.DateTimeFormatOptions) =>
  formatLocaleDate(ymdNoon(ymd), options);

/** "Thursday 15 October 2026" */
export const gregLong = (ymd: string) =>
  gregLabel(ymd, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "15 Oct" */
export const gregShort = (ymd: string) => gregLabel(ymd, { day: 'numeric', month: 'short' });

/** The day's number in a calendar. */
export function dayNumber(kind: CalendarKind, d: CalendarDay, lang: Lang): string {
  if (kind === 'greg') return num(Number(d.ymd.slice(8)), lang);
  if (kind === 'hijri') return num(d.hijri.day, lang);
  return bnDigits(d.bengali.day);
}

export function isMonthStart(kind: CalendarKind, d: CalendarDay): boolean {
  if (kind === 'greg') return d.ymd.endsWith('-01');
  if (kind === 'hijri') return d.hijri.day === 1;
  return d.bengali.day === 1;
}

const monthName = (kind: CalendarKind, d: CalendarDay, t: TFunction) =>
  kind === 'greg'
    ? gregLabel(d.ymd, { month: 'long' })
    : kind === 'hijri'
      ? hijriMonthName(t, d.hijri.month)
      : BENGALI_MONTHS[d.bengali.month - 1];

const yearOf = (kind: CalendarKind, d: CalendarDay, lang: Lang) =>
  kind === 'greg'
    ? num(d.ymd.slice(0, 4), lang)
    : kind === 'hijri'
      ? num(d.hijri.year, lang)
      : bnDigits(d.bengali.year);

const yearSuffix = (kind: CalendarKind, t: TFunction) =>
  kind === 'hijri' ? ` ${t('hijriMonths.ah')}` : kind === 'bn' ? ' বঙ্গাব্দ' : '';

/** "October 2026", "Jumādā al-Ūlā 1448 AH", "কার্তিক ১৪৩৩ বঙ্গাব্দ" */
export const monthTitle = (kind: CalendarKind, d: CalendarDay, t: TFunction, lang: Lang) =>
  `${monthName(kind, d, t)} ${yearOf(kind, d, lang)}${yearSuffix(kind, t)}`;

/** The months of a calendar that a run of days spans: "Rabīʿ al-Ākhir - Jumādā al-Ūlā 1448 AH". */
export function monthSpan(
  kind: CalendarKind,
  days: readonly CalendarDay[],
  t: TFunction,
  lang: Lang
): string {
  const a = days[0];
  const z = days[days.length - 1];
  const first = monthName(kind, a, t);
  const last = monthName(kind, z, t);
  if (first === last) return monthTitle(kind, z, t, lang);
  const ya = yearOf(kind, a, lang);
  const yz = yearOf(kind, z, lang);
  return `${first}${ya !== yz ? ` ${ya}` : ''} - ${last} ${yz}${yearSuffix(kind, t)}`;
}

/** An event's name; `short` for a small box (holidays have short names). */
export function eventName(e: CalendarEvent, t: TFunction, lang: Lang, short = false): string {
  if (e.type === 'islamic') return t(`specialDays.${e.id}.name`);
  const item = e.type === 'holiday' ? e.holiday : e.day;
  if (short) return (lang === 'bn' ? item.shortBn : item.shortEn) ?? item[lang];
  return item[lang];
}
