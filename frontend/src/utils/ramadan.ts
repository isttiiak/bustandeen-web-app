// Ramadan window resolution — fully client-side via getHijriDate (umalqura +
// the user's ±1 day moon-sighting adjustment), consistent with every other
// hijri-dependent feature (CLAUDE.md convention).
import { getHijriDate } from './islamicCalendar.js';
import { getTrackingDay } from './trackingDay.js';

export interface RamadanDayInfo {
  /** Gregorian local date string YYYY-MM-DD */
  date: string;
  /** 1..30 */
  dayNumber: number;
  isOdd: boolean;
  isLastTen: boolean;
}

export interface RamadanWindow {
  /** true when today is inside Ramadan */
  active: boolean;
  /** 1-based Ramadan day number for today (only when active) */
  todayNumber: number | null;
  /** Every day of the (current or next) Ramadan */
  days: RamadanDayInfo[];
  /** Days remaining until Ramadan 1 (0 when active) */
  daysUntil: number;
  /** Hijri year of that Ramadan */
  hijriYear: number | null;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Resolve the current Ramadan (if we're inside it) or the next one.
 * Scans day-by-day — bounded to ~400 iterations, instant in practice.
 */
export function getRamadanWindow(): RamadanWindow {
  const todayStr = getTrackingDay();
  const cursor = new Date(todayStr + 'T12:00:00');

  const h = getHijriDate(cursor);
  if (!h) return { active: false, todayNumber: null, days: [], daysUntil: 0, hijriYear: null };

  // Find Ramadan 1: walk back if we're inside Ramadan, else walk forward.
  const start = new Date(cursor);
  if (h.month === 9) {
    start.setDate(start.getDate() - (h.day - 1));
  } else {
    for (let i = 0; i < 400; i++) {
      start.setDate(start.getDate() + 1);
      const hh = getHijriDate(start);
      if (hh?.month === 9 && hh.day === 1) break;
    }
  }

  // Collect every day of that Ramadan (29 or 30 — stop when month flips)
  const days: RamadanDayInfo[] = [];
  const d = new Date(start);
  let hijriYear: number | null = null;
  for (let n = 1; n <= 30; n++) {
    const hd = getHijriDate(d);
    if (hd?.month !== 9) break;
    hijriYear = hd.year;
    days.push({
      date: ymd(d),
      dayNumber: n,
      isOdd: n % 2 === 1,
      isLastTen: n >= 21,
    });
    d.setDate(d.getDate() + 1);
  }

  // DEV/PREVIEW ONLY: `?preview=live` pretends we are inside Ramadan so the
  // live tracker can be designed and reviewed outside the month. It never
  // changes what is logged — the day grid still carries the real Ramadan
  // dates, and the flag has to be typed into the URL by hand.
  const previewLive =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'live';

  const active = h.month === 9 || previewLive;
  const todayNumber = h.month === 9 ? h.day : previewLive ? 1 : null;
  const startStr = days[0]?.date ?? todayStr;
  const daysUntil = active
    ? 0
    : Math.max(
        0,
        Math.round(
          (new Date(startStr + 'T12:00:00').getTime() -
            new Date(todayStr + 'T12:00:00').getTime()) /
            86_400_000
        )
      );

  return { active, todayNumber, days, daysUntil, hijriYear };
}
