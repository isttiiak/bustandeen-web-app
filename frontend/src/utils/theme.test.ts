import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDaylightWindow,
  getThemeMode,
  isDaytime,
  resolveTheme,
  THEME_MODE_KEY,
} from './theme.js';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// TZ is pinned to Asia/Dhaka for the test run.
const at = (hhmm: string) => new Date(`2026-10-02T${hhmm}:00+06:00`);

describe('getThemeMode', () => {
  it('defaults to system when the browser can report it', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(getThemeMode()).toBe('system');
  });

  it('defaults to dark when it cannot', () => {
    vi.stubGlobal('window', {});
    expect(getThemeMode()).toBe('dark');
    localStorage.setItem(THEME_MODE_KEY, 'system');
    expect(getThemeMode()).toBe('dark');
  });

  it('keeps a saved choice and ignores junk', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    localStorage.setItem(THEME_MODE_KEY, 'daylight');
    expect(getThemeMode()).toBe('daylight');
    localStorage.setItem(THEME_MODE_KEY, 'neon');
    expect(getThemeMode()).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('maps fixed modes', () => {
    expect(resolveTheme('dark')).toBe('bustandeen');
    expect(resolveTheme('light')).toBe('bustandeen-light');
  });

  it('follows the system preference', () => {
    expect(resolveTheme('system', { prefersLight: true })).toBe('bustandeen-light');
    expect(resolveTheme('system', { prefersLight: false })).toBe('bustandeen');
  });

  it('follows daylight between sunrise and Maghrib', () => {
    const daylight = { start: at('05:50'), end: at('17:48') };
    expect(resolveTheme('daylight', { now: at('05:49'), daylight })).toBe('bustandeen');
    expect(resolveTheme('daylight', { now: at('05:50'), daylight })).toBe('bustandeen-light');
    expect(resolveTheme('daylight', { now: at('17:47'), daylight })).toBe('bustandeen-light');
    expect(resolveTheme('daylight', { now: at('17:48'), daylight })).toBe('bustandeen');
  });
});

describe('isDaytime without a location', () => {
  it('uses 06:00 to 18:00 local time', () => {
    expect(isDaytime(at('05:59'), null)).toBe(false);
    expect(isDaytime(at('06:00'), null)).toBe(true);
    expect(isDaytime(at('17:59'), null)).toBe(true);
    expect(isDaytime(at('18:00'), null)).toBe(false);
  });
});

describe('getDaylightWindow', () => {
  it('is null without a saved location', () => {
    expect(getDaylightWindow(at('12:00'))).toBeNull();
    localStorage.setItem('bustandeen_location', '{"latitude":"x"}');
    expect(getDaylightWindow(at('12:00'))).toBeNull();
  });

  it('is sunrise to Maghrib for a saved location (Dhaka)', () => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41 })
    );
    const w = getDaylightWindow(at('12:00'));
    expect(w).not.toBeNull();
    // Dhaka, early October: sunrise just before 06:00, Maghrib just before 18:00.
    expect(w!.start.getHours()).toBe(5);
    expect(w!.end.getHours()).toBe(17);
    expect(w!.start < w!.end).toBe(true);
  });
});
