// Umm al-Qura helpers for moon-sighting records (T4.1). The same rule as the
// app's frontend/src/utils/hijriOffset.ts (recordShift): the server only
// validates records and derives the fields older app builds read.

const DAY = 86_400_000;

export interface HijriYmd {
  year: number;
  month: number;
  day: number;
}

/** How far a record's start may be from Umm al-Qura's 1st of that month. */
export const MAX_RECORD_SHIFT = 2;

let uqFormat: Intl.DateTimeFormat | null = null;

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);
}

/** Umm al-Qura date of a civil day (YYYY-MM-DD). */
export function ummAlQura(day: string): HijriYmd {
  uqFormat ??= new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const parts = uqFormat.formatToParts(new Date(`${day}T12:00:00Z`));
  const num = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return { year: num('year'), month: num('month'), day: num('day') };
}

/** Days from the start to Umm al-Qura's 1st of the same month (-1 = the
 * country began a day after Umm al-Qura); null when more than
 * MAX_RECORD_SHIFT days away. */
export function recordShift(r: {
  hijriYear: number;
  hijriMonth: number;
  startDate: string;
}): number | null {
  for (const k of [0, -1, 1, -2, 2]) {
    const h = ummAlQura(addDays(r.startDate, k));
    if (h.year === r.hijriYear && h.month === r.hijriMonth && h.day === 1) return k;
  }
  return null;
}

export function previousHijriMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextHijriMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}
