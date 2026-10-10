import { beforeEach, describe, expect, it, vi } from 'vitest';

// U9: what a visitor changes in the demo is undone when it ends, or on the
// next visit after the tab was closed during it.

const { local, session } = vi.hoisted(() => {
  const store = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  };
  const local = store();
  const session = store();
  Object.assign(globalThis, { localStorage: local, sessionStorage: session });
  return { local, session };
});

const {
  DEMO_RESTORE_KEY,
  DEMO_SESSION_KEY,
  restoreAfterClosedDemo,
  restoreDeviceSettings,
  snapshotDeviceSettings,
} = await import('./demoSession.js');

beforeEach(() => {
  local.clear();
  session.clear();
});

describe('device settings around the demo', () => {
  it('changed keys come back, keys the demo added go', () => {
    local.setItem('bustandeen_theme_mode', 'light');
    local.setItem('bustandeen_lang', 'bn');
    snapshotDeviceSettings();

    local.setItem('bustandeen_theme_mode', 'dark');
    local.setItem('bustandeen_home_goals', '{"on":false}');
    local.removeItem('bustandeen_lang');
    restoreDeviceSettings();

    expect(local.getItem('bustandeen_theme_mode')).toBe('light');
    expect(local.getItem('bustandeen_lang')).toBe('bn');
    expect(local.getItem('bustandeen_home_goals')).toBeNull();
    expect(local.getItem(DEMO_RESTORE_KEY)).toBeNull();
  });

  it('entering twice keeps the first copy', () => {
    local.setItem('bustandeen_lang', 'en');
    snapshotDeviceSettings();
    local.setItem('bustandeen_lang', 'bn');
    snapshotDeviceSettings();
    restoreDeviceSettings();
    expect(local.getItem('bustandeen_lang')).toBe('en');
  });

  it('a real sign-in that started meanwhile survives the restore', () => {
    snapshotDeviceSettings();
    local.setItem('bustandeen_user', '{"uid":"real"}');
    local.setItem('bustandeen_idToken', 'tok');
    local.setItem('bustandeen_has_session', '1');
    restoreDeviceSettings();
    expect(local.getItem('bustandeen_user')).toBe('{"uid":"real"}');
    expect(local.getItem('bustandeen_idToken')).toBe('tok');
    expect(local.getItem('bustandeen_has_session')).toBe('1');
  });

  it('nothing to restore without a copy', () => {
    local.setItem('bustandeen_lang', 'bn');
    restoreDeviceSettings();
    expect(local.getItem('bustandeen_lang')).toBe('bn');
  });

  it('at start-up: restores after a closed demo tab, not during a refresh', () => {
    local.setItem('bustandeen_lang', 'en');
    snapshotDeviceSettings();
    local.setItem('bustandeen_lang', 'bn');

    session.setItem(DEMO_SESSION_KEY, 'male');
    restoreAfterClosedDemo();
    expect(local.getItem('bustandeen_lang')).toBe('bn');

    session.clear();
    restoreAfterClosedDemo();
    expect(local.getItem('bustandeen_lang')).toBe('en');
  });
});
