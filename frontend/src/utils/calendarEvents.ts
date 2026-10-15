// What happens on a calendar day (Library calendar): Islamic days, government
// holidays and national days, in that priority order (the day box shows the
// first ones, the "This month" list shows them all). Pure: names of Islamic
// days come from i18n (`specialDays.<id>.name`) in the screen, holiday and
// national-day names from the curated data.

import {
  BD_HOLIDAY_YEARS,
  BD_NATIONAL_DAYS,
  type Holiday,
  type HolidayYear,
  type NationalDay,
} from '../data/calendar/bd.js';
import type { CalendarDay } from './calendarMonth.js';
import {
  NIGHT_SPECIAL_DAYS,
  RECURRING_SPECIAL_DAYS,
  specialDayIds,
  type SpecialDayId,
} from './specialDayRules.js';

export type CalendarEvent =
  | { type: 'islamic'; id: SpecialDayId; night: boolean; recurring: boolean }
  | { type: 'holiday'; holiday: Holiday }
  | { type: 'national'; day: NationalDay };

export interface EventFilters {
  /** ISO country of the calendar (profile, else saved place); holidays and national days need one. */
  country: string | null;
  islamic: boolean;
  holidays: boolean;
  national: boolean;
}

interface CountryCalendar {
  holidays: readonly HolidayYear[];
  national: readonly NationalDay[];
}

/** Countries with curated holidays; others show Islamic days only. */
export const COUNTRY_CALENDARS: Readonly<Record<string, CountryCalendar>> = {
  BD: { holidays: BD_HOLIDAY_YEARS, national: BD_NATIONAL_DAYS },
};

// The grid shades Fridays as the weekend and Monday/Thursday fasts are weekly:
// as events they would mark most days, so the calendar leaves them out.
const WEEKLY: ReadonlySet<SpecialDayId> = new Set(['friday', 'fast_mon_thu']);

/** Holiday list years a country has (the screen says when a year is missing). */
export function holidayYears(country: string | null): number[] {
  return country ? (COUNTRY_CALENDARS[country]?.holidays.map((y) => y.year) ?? []) : [];
}

/**
 * Years among `days` that have no holiday list yet, for a country that has
 * lists (e.g. 2027 before the government publishes it). Empty for a country
 * without any list: the settings already say none is available.
 */
export function missingHolidayYears(
  country: string | null,
  days: readonly CalendarDay[]
): number[] {
  const have = holidayYears(country);
  if (!have.length) return [];
  const years = [...new Set(days.map((d) => Number(d.ymd.slice(0, 4))))];
  return years.filter((y) => !have.includes(y));
}

/** Where a country's holiday lists come from (newest year first). */
export function holidaySources(
  country: string | null
): { year: number; title: string; url: string }[] {
  const lists = country ? (COUNTRY_CALENDARS[country]?.holidays ?? []) : [];
  return [...lists]
    .sort((a, b) => b.year - a.year)
    .flatMap((y) => y.sources.map((s) => ({ year: y.year, ...s })));
}

/** A day's events, Islamic first, then government holidays, then national days. */
export function dayEvents(day: CalendarDay, filters: EventFilters): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  if (filters.islamic) {
    for (const id of specialDayIds(day.hijri, day.weekday)) {
      if (WEEKLY.has(id)) continue;
      out.push({
        type: 'islamic',
        id,
        night: NIGHT_SPECIAL_DAYS.has(id),
        recurring: RECURRING_SPECIAL_DAYS.has(id),
      });
    }
  }
  const local = filters.country ? COUNTRY_CALENDARS[filters.country] : undefined;
  if (local && filters.holidays) {
    const year = local.holidays.find((y) => y.year === Number(day.ymd.slice(0, 4)));
    for (const holiday of year?.holidays ?? []) {
      if (holiday.date === day.ymd) out.push({ type: 'holiday', holiday });
    }
  }
  if (local && filters.national) {
    const md = day.ymd.slice(5);
    for (const nd of local.national)
      if (nd.monthDay === md) out.push({ type: 'national', day: nd });
  }
  return out;
}

/**
 * Events in the `days` given (e.g. the next 30), without the ones that come
 * every month (Ayyam al-Bid); the first ten days of Dhul Hijjah count once,
 * on the 1st.
 */
export function upcomingEvents(
  days: readonly CalendarDay[],
  filters: EventFilters
): { day: CalendarDay; event: CalendarEvent }[] {
  const out: { day: CalendarDay; event: CalendarEvent }[] = [];
  for (const day of days) {
    for (const event of dayEvents(day, filters)) {
      if (event.type === 'islamic' && event.recurring) continue;
      if (event.type === 'islamic' && event.id === 'dhul_hijjah_first10' && day.hijri.day !== 1) {
        continue;
      }
      out.push({ day, event });
    }
  }
  return out;
}

/** Whether a day is a government holiday (its number is shown in the holiday colour). */
export const isHoliday = (events: readonly CalendarEvent[]) =>
  events.some((e) => e.type === 'holiday');
