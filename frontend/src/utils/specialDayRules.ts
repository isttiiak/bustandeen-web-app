// Which special days fall on a day: the rules behind getTodaySpecialDays
// (islamicCalendar.ts), as a pure function of the Hijri date and the weekday
// so the calendar can ask it for every day of a month. The day's content
// (names, rulings, references) stays in SPECIAL_DAYS.

export type SpecialDayId =
  | 'friday'
  | 'fast_mon_thu'
  | 'ayyam_al_bid'
  | 'islamic_new_year'
  | 'ashura'
  | 'shab_e_barat'
  | 'laylat_qadr'
  | 'eid_fitr'
  | 'dhul_hijjah_first10'
  | 'arafah'
  | 'eid_adha';

/** Recurring every week or every month (the calendar's "next 30 days" leaves these out). */
export const RECURRING_SPECIAL_DAYS: ReadonlySet<SpecialDayId> = new Set([
  'friday',
  'fast_mon_thu',
  'ayyam_al_bid',
]);

/** Days whose event is the night before (it begins at the previous Maghrib). */
export const NIGHT_SPECIAL_DAYS: ReadonlySet<SpecialDayId> = new Set([
  'shab_e_barat',
  'laylat_qadr',
]);

/**
 * The special days on a day, in this order: weekly, then monthly, then yearly.
 * `hijri` is the day's Hijri date (null when unknown: weekly days only);
 * `weekday` is 0 = Sunday ... 5 = Friday.
 */
export function specialDayIds(
  hijri: { month: number; day: number } | null,
  weekday: number
): SpecialDayId[] {
  const ids: SpecialDayId[] = [];

  // Friday
  if (weekday === 5) ids.push('friday');

  // Monday (1) or Thursday (4)
  if (weekday === 1 || weekday === 4) ids.push('fast_mon_thu');

  if (hijri) {
    const { month, day } = hijri;
    // Ayyam al-Bid: 13th, 14th, 15th of every month
    if (day === 13 || day === 14 || day === 15) ids.push('ayyam_al_bid');

    // Muharram
    if (month === 1) {
      if (day === 1) ids.push('islamic_new_year');
      if (day === 9 || day === 10) ids.push('ashura');
    }

    // Sha'ban 14th/15th: Laylat al-Bara'ah
    if (month === 8 && (day === 14 || day === 15)) ids.push('shab_e_barat');

    // Ramadan (month 9): odd nights of last 10 = Laylat al-Qadr
    if (month === 9 && day >= 21 && day % 2 === 1) ids.push('laylat_qadr');

    // Shawwal 1st = Eid al-Fitr
    if (month === 10 && day === 1) ids.push('eid_fitr');

    // Dhul Hijjah
    if (month === 12) {
      if (day >= 1 && day <= 8) ids.push('dhul_hijjah_first10');
      if (day === 9) ids.push('arafah');
      if (day === 10) ids.push('eid_adha');
    }
  }

  return ids;
}
