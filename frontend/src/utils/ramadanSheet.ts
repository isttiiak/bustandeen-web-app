// The printable Ramadan timetable of the saved place (audit R12): the same
// A4 sheet as the prerendered Ramadan calendars, for any town on Earth. The
// static pages only exist for the need-based cities and the 64 Bangladesh
// districts; this sheet is computed on the device from the saved location,
// so it also works offline and for guests.
//
// Dates are the app's own Ramadan window (getRamadanWindow: Umm al-Qura with
// the user's Hijri offset, or the country's moon-sighting records). Times are
// the app's own (calcPrayerTimesForDay: the user's method and the country
// calibration), on the place's clock, so the sheet shows the same minute as
// the Ramadan page.
import { getHijriOffsetSource } from './islamicCalendar.js';
import { calcPrayerTimesForDay } from './prayerTimes.js';
import { addDaysYmd, placeZone, type SavedPlace } from './placeClock.js';
import { countryAt, getCalcMethod, type CalculationMethodId } from './salatPrefs.js';
import { countryTimeAdjustments, type TimeAdjustments } from './countryDefaults.js';
import type { RamadanWindow } from './ramadan.js';

export interface RamadanSheetRow {
  /** 1-based number of the fast. */
  fast: number;
  /** `YYYY-MM-DD`, the civil date at the place. */
  date: string;
  /** When sehri ends (Fajr, or the country's minutes before it). */
  sehri: Date;
  /** Iftar: Maghrib. */
  iftar: Date;
}

export interface RamadanSheet {
  hijriYear: number;
  place: SavedPlace;
  /** The place's IANA zone, when known (the times are on its clock). */
  zone: string | null;
  rows: RamadanSheetRow[];
  /** The day after a 29-day month, until the Shawwal moon settles it. */
  possible30: RamadanSheetRow | null;
  method: CalculationMethodId;
  /** The place's country (from its zone), if known. */
  country: string | null;
  /** The country's match to its official timetable, when it applies
   * (countryDefaults: only with the country's own default method). */
  calibration: TimeAdjustments | null;
}

function sheetRow(place: SavedPlace, date: string, fast: number): RamadanSheetRow {
  const t = calcPrayerTimesForDay(place.latitude, place.longitude, date);
  return { fast, date, sehri: t.sehri, iftar: t.maghrib };
}

/** The sheet of `window`'s Ramadan at `place`, or null without a Ramadan. */
export function buildRamadanSheet(window: RamadanWindow, place: SavedPlace): RamadanSheet | null {
  if (window.hijriYear == null || window.days.length === 0) return null;
  const rows = window.days.map((d) => sheetRow(place, d.date, d.dayNumber));
  let possible30: RamadanSheetRow | null = null;
  const last = rows[rows.length - 1]!;
  if (rows.length === 29) {
    const next = addDaysYmd(last.date, 1);
    // A Shawwal record for this year fixes the month at 29 days.
    const { record } = getHijriOffsetSource(new Date(`${next}T12:00:00`));
    const settled = record?.hijriYear === window.hijriYear && record.hijriMonth === 10;
    if (!settled) possible30 = sheetRow(place, next, 30);
  }
  const method = getCalcMethod();
  const country = countryAt(place.latitude, place.longitude);
  return {
    hijriYear: window.hijriYear,
    place,
    zone: placeZone(place.latitude, place.longitude),
    rows,
    possible30,
    method,
    country,
    calibration: countryTimeAdjustments(country, method),
  };
}

/** "23.81° N, 90.41° E": two decimals (about a kilometre) are enough to
 * reproduce the times and say no more than that about the place. */
export function formatCoordinates(lat: number, lng: number): string {
  const part = (v: number, pos: string, neg: string) =>
    `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
  return `${part(lat, 'N', 'S')}, ${part(lng, 'E', 'W')}`;
}
