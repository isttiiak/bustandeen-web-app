// Theme choice (audit T3.2). The user picks a MODE; we resolve it to one of
// the two DaisyUI themes and set it on <html data-theme>.
//
// The resolved theme is also written to `bustandeen_theme`, which the
// CSP-hashed inline script in index.html reads before first paint, so a
// returning visitor never sees the wrong theme flash. That script is not
// touched here (changing it means a new CSP hash in vercel.json).
//
// "daylight" follows the sun on the device: light from sunrise to Maghrib
// when a location is saved (computed on-device, location never leaves),
// otherwise 06:00 to 18:00 local time.

import { calcPrayerTimes } from './prayerTimes.js';
import { isSeoPagePath } from '../seo/staticPaths.js';

export type ThemeMode = 'system' | 'dark' | 'light' | 'daylight';
export type ResolvedTheme = 'bustandeen' | 'bustandeen-light';

export const THEME_MODES: ThemeMode[] = ['system', 'dark', 'light', 'daylight'];
export const THEME_MODE_KEY = 'bustandeen_theme_mode';
export const RESOLVED_THEME_KEY = 'bustandeen_theme';

const THEME_COLOR: Record<ResolvedTheme, string> = {
  bustandeen: '#1a1812',
  'bustandeen-light': '#edefe2',
};

function canFollowSystem(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** The default is "system" wherever the browser can report it, else dark. */
export function getThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null;
    if (raw && THEME_MODES.includes(raw)) {
      return raw === 'system' && !canFollowSystem() ? 'dark' : raw;
    }
  } catch {
    // storage blocked: fall through to the default
  }
  return canFollowSystem() ? 'system' : 'dark';
}

export interface DaylightWindow {
  start: Date;
  end: Date;
}

/** Today's sunrise and Maghrib from the saved location, or null. */
export function getDaylightWindow(now: Date = new Date()): DaylightWindow | null {
  try {
    const raw = localStorage.getItem('bustandeen_location');
    if (!raw) return null;
    const loc = JSON.parse(raw) as { latitude?: unknown; longitude?: unknown };
    if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
    const t = calcPrayerTimes(loc.latitude, loc.longitude, now);
    if (!(t.sunrise instanceof Date) || !(t.maghrib instanceof Date)) return null;
    if (Number.isNaN(t.sunrise.getTime()) || Number.isNaN(t.maghrib.getTime())) return null;
    return { start: t.sunrise, end: t.maghrib };
  } catch {
    return null;
  }
}

export function isDaytime(now: Date, window: DaylightWindow | null): boolean {
  if (window) return now >= window.start && now < window.end;
  const h = now.getHours();
  return h >= 6 && h < 18;
}

export function resolveTheme(
  mode: ThemeMode,
  opts: { now?: Date; prefersLight?: boolean; daylight?: DaylightWindow | null } = {}
): ResolvedTheme {
  switch (mode) {
    case 'light':
      return 'bustandeen-light';
    case 'system':
      return opts.prefersLight ? 'bustandeen-light' : 'bustandeen';
    case 'daylight':
      return isDaytime(opts.now ?? new Date(), opts.daylight ?? null)
        ? 'bustandeen-light'
        : 'bustandeen';
    default:
      return 'bustandeen';
  }
}

function prefersLight(): boolean {
  return canFollowSystem() && window.matchMedia('(prefers-color-scheme: light)').matches;
}

/** Resolve the saved mode now and apply it to the document. */
export function applyTheme(mode: ThemeMode = getThemeMode()): ResolvedTheme {
  // SEO pages keep their own dark palette (see prerender.mjs `data-static`).
  if (isSeoPagePath(window.location.pathname)) {
    document.documentElement.setAttribute('data-theme', 'bustandeen');
    return 'bustandeen';
  }
  const theme = resolveTheme(mode, {
    prefersLight: mode === 'system' ? prefersLight() : false,
    daylight: mode === 'daylight' ? getDaylightWindow() : null,
  });
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  try {
    localStorage.setItem(RESOLVED_THEME_KEY, theme);
  } catch {
    // storage blocked: the theme still applies for this page view
  }
  return theme;
}

export function setThemeMode(mode: ThemeMode): ResolvedTheme {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // storage blocked: apply for this page view only
  }
  return applyTheme(mode);
}

/** Keeps the theme right while the app is open: OS theme changes, the
 *  daylight boundary passing, and returning to a backgrounded tab. */
export function watchTheme(): () => void {
  applyTheme();
  const media = canFollowSystem() ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const onChange = () => applyTheme();
  media?.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onChange);
  const timer = window.setInterval(() => {
    if (getThemeMode() === 'daylight') applyTheme();
  }, 60_000);
  return () => {
    media?.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onChange);
    window.clearInterval(timer);
  };
}
