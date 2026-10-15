// Settings of the Islamic calendar (Library): which calendars to show and in
// what order, the main grid, week start, weekend days and which events to
// show. Plain localStorage like every other setting; the keys are in the
// cross-device sync lists (prefsSync.ts SYNCED_KEYS and the backend's
// SYNCED_PREF_KEYS).

import type { CalendarKind } from './calendarMonth.js';

export const CALENDAR_LAYERS_KEY = 'bustandeen_calendar_layers';
export const CALENDAR_GRID_KEY = 'bustandeen_calendar_grid';
export const CALENDAR_WEEK_START_KEY = 'bustandeen_calendar_week_start';
export const CALENDAR_WEEKEND_KEY = 'bustandeen_calendar_weekend';
export const CALENDAR_SHOW_KEY = 'bustandeen_calendar_show';

export const CALENDAR_PREF_KEYS = [
  CALENDAR_LAYERS_KEY,
  CALENDAR_GRID_KEY,
  CALENDAR_WEEK_START_KEY,
  CALENDAR_WEEKEND_KEY,
  CALENDAR_SHOW_KEY,
] as const;

const KINDS: readonly CalendarKind[] = ['greg', 'hijri', 'bn'];
/** English and Hijri; the Bengali calendar only when chosen in settings. */
export const DEFAULT_LAYERS: readonly CalendarKind[] = ['greg', 'hijri'];

export type CalendarShow = 'islamic' | 'holidays' | 'national';
const SHOWS: readonly CalendarShow[] = ['islamic', 'holidays', 'national'];

export interface CalendarPrefs {
  /** 1 to 3 calendars, in the order the day shows them (first = main number). */
  layers: CalendarKind[];
  /** The calendar the month grid follows: English or Hijri. */
  grid: 'greg' | 'hijri';
  /** 0 = Sunday ... 6 = Saturday */
  weekStart: number;
  weekend: number[];
  show: Record<CalendarShow, boolean>;
}

// Bangladesh's weekend is Friday and Saturday (the 2026 holiday notification
// counts the holidays that "fall on Friday and Saturday"), but browsers' locale
// data says Saturday and Sunday; its calendars start the week on Saturday.
// Other countries: the browser's locale data (right for Saudi Arabia, Egypt,
// Iran, the UAE and others checked 2026-10-15).
const COUNTRY_WEEK: Readonly<Record<string, { weekStart: number; weekend: number[] }>> = {
  BD: { weekStart: 6, weekend: [5, 6] },
};

interface WeekInfo {
  firstDay: number; // 1 = Monday ... 7 = Sunday
  weekend: number[];
}

function localeWeek(country: string | null): WeekInfo | null {
  try {
    const locale = new Intl.Locale(country ? `und-${country}` : 'und') as Intl.Locale & {
      getWeekInfo?: () => WeekInfo;
      weekInfo?: WeekInfo;
    };
    return locale.getWeekInfo?.() ?? locale.weekInfo ?? null;
  } catch {
    return null;
  }
}

/** Week start and weekend for a country (ISO code), before the user changes them. */
export function defaultWeek(country: string | null): { weekStart: number; weekend: number[] } {
  const own = country ? COUNTRY_WEEK[country] : undefined;
  if (own) return { weekStart: own.weekStart, weekend: [...own.weekend] };
  const info = localeWeek(country);
  if (!info) return { weekStart: 0, weekend: [6, 0] };
  return { weekStart: info.firstDay % 7, weekend: info.weekend.map((d) => d % 7) };
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Parses a stored layer list; anything unusable gives the default. */
export function parseLayers(raw: string | null): CalendarKind[] {
  const list = (raw ?? '')
    .split(',')
    .filter((k): k is CalendarKind => (KINDS as readonly string[]).includes(k));
  const unique = [...new Set(list)];
  return unique.length ? unique : [...DEFAULT_LAYERS];
}

function parseDays(raw: string | null): number[] | null {
  if (raw === null) return null;
  if (raw === '') return [];
  const days = raw.split(',').map(Number);
  return days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ? [...new Set(days)] : null;
}

/** The calendar settings, with defaults for the country (`country`: ISO code). */
export function readCalendarPrefs(country: string | null): CalendarPrefs {
  const week = defaultWeek(country);
  const layers = parseLayers(read(CALENDAR_LAYERS_KEY));
  const gridRaw = read(CALENDAR_GRID_KEY);
  const grids = layers.filter((k): k is 'greg' | 'hijri' => k !== 'bn');
  const grid = gridRaw === 'greg' || gridRaw === 'hijri' ? gridRaw : (grids[0] ?? 'greg');
  const startRaw = Number(read(CALENDAR_WEEK_START_KEY) ?? NaN);
  const showRaw = read(CALENDAR_SHOW_KEY);
  const shown = showRaw === null ? SHOWS : showRaw.split(',');
  return {
    layers,
    grid,
    weekStart:
      Number.isInteger(startRaw) && startRaw >= 0 && startRaw <= 6 ? startRaw : week.weekStart,
    weekend: parseDays(read(CALENDAR_WEEKEND_KEY)) ?? week.weekend,
    show: {
      islamic: shown.includes('islamic'),
      holidays: shown.includes('holidays'),
      national: shown.includes('national'),
    },
  };
}

/** Stores the settings that changed (each key syncs on its own). */
export function writeCalendarPrefs(prefs: Partial<CalendarPrefs>): void {
  try {
    if (prefs.layers) {
      const layers = parseLayers(prefs.layers.join(','));
      localStorage.setItem(CALENDAR_LAYERS_KEY, layers.join(','));
    }
    if (prefs.grid) localStorage.setItem(CALENDAR_GRID_KEY, prefs.grid);
    if (prefs.weekStart !== undefined) {
      localStorage.setItem(CALENDAR_WEEK_START_KEY, String(prefs.weekStart));
    }
    if (prefs.weekend) {
      localStorage.setItem(CALENDAR_WEEKEND_KEY, [...new Set(prefs.weekend)].sort().join(','));
    }
    if (prefs.show) {
      localStorage.setItem(CALENDAR_SHOW_KEY, SHOWS.filter((s) => prefs.show?.[s]).join(','));
    }
  } catch {
    // private mode: the settings last for this visit only
  }
}
