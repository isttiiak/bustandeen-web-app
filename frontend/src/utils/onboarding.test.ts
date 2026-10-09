import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOCUS_KEY,
  HOME_TIMELINE_KEY,
  completeOrder,
  defaultTimelineFor,
  getFocusHabits,
  getHomeTimeline,
  initialGoal,
  isOnboardedLocally,
  markOnboardedLocally,
  onboardingMode,
  orderByFocus,
  moveHabit,
  setFocusHabits,
  setHomeTimeline,
} from './onboarding.js';

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
  clear() {
    this.map.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('onboardingMode', () => {
  it('shows nothing while the profile loads', () => {
    expect(onboardingMode(undefined, false)).toBe('none');
  });
  it('sends a new, not-yet-onboarded account to the flow', () => {
    expect(onboardingMode({ onboardingRequired: true, onboardedAt: null }, false)).toBe('flow');
  });
  it('offers existing accounts the Home card, never the flow', () => {
    expect(onboardingMode({ onboardingRequired: false, onboardedAt: null }, false)).toBe('card');
    expect(onboardingMode({}, false)).toBe('card');
  });
  it('treats the demo (no server record) like an existing account', () => {
    expect(onboardingMode(null, false)).toBe('card');
  });
  it('shows nothing once onboarded on the server or on this device', () => {
    const at = '2026-10-09T10:00:00.000Z';
    expect(onboardingMode({ onboardingRequired: true, onboardedAt: at }, false)).toBe('none');
    expect(onboardingMode({ onboardingRequired: false, onboardedAt: at }, false)).toBe('none');
    expect(onboardingMode({ onboardingRequired: true, onboardedAt: null }, true)).toBe('none');
    expect(onboardingMode(null, true)).toBe('none');
  });
});

describe('habit order', () => {
  it('defaults to Salat, Zikr, Quran, Fasting', () => {
    expect(getFocusHabits()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
  });
  it('round-trips a full order', () => {
    setFocusHabits(['quran', 'fasting', 'salat', 'zikr']);
    expect(getFocusHabits()).toEqual(['quran', 'fasting', 'salat', 'zikr']);
  });
  it('completes an older setup (up to three picks) with the rest in default order', () => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(['quran', 'salat']));
    expect(getFocusHabits()).toEqual(['quran', 'salat', 'zikr', 'fasting']);
  });
  it('drops unknown values and duplicates', () => {
    expect(completeOrder(['zikr', 'cycle', 'zikr', 'fasting'])).toEqual([
      'zikr',
      'fasting',
      'salat',
      'quran',
    ]);
  });
  it('survives a corrupt value', () => {
    localStorage.setItem(FOCUS_KEY, '{oops');
    expect(getFocusHabits()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
    localStorage.setItem(FOCUS_KEY, '"salat"');
    expect(getFocusHabits()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
  });
  it('moves one place up or down; the ends stay put', () => {
    const o = ['salat', 'zikr', 'quran', 'fasting'] as const;
    expect(moveHabit([...o], 'quran', -1)).toEqual(['salat', 'quran', 'zikr', 'fasting']);
    expect(moveHabit([...o], 'salat', 1)).toEqual(['zikr', 'salat', 'quran', 'fasting']);
    expect(moveHabit([...o], 'salat', -1)).toEqual([...o]);
    expect(moveHabit([...o], 'fasting', 1)).toEqual([...o]);
  });
});

describe('Home timeline preference', () => {
  it('is on unless turned off (older accounts keep it)', () => {
    expect(getHomeTimeline()).toBe(true);
    setHomeTimeline(false);
    expect(localStorage.getItem(HOME_TIMELINE_KEY)).toBe('0');
    expect(getHomeTimeline()).toBe(false);
    setHomeTimeline(true);
    expect(getHomeTimeline()).toBe(true);
  });
  it('the setup suggests it when Salat comes first', () => {
    expect(defaultTimelineFor(['salat', 'zikr', 'quran', 'fasting'])).toBe(true);
    expect(defaultTimelineFor(['zikr', 'salat', 'quran', 'fasting'])).toBe(false);
  });
});

describe('orderByFocus', () => {
  const cards = [{ id: 'zikr' }, { id: 'salat' }, { id: 'fasting' }, { id: 'quran' }];
  it('keeps the usual order with no focus', () => {
    expect(orderByFocus(cards, []).map((c) => c.id)).toEqual(['zikr', 'salat', 'fasting', 'quran']);
  });
  it('puts chosen habits first, in the order picked', () => {
    expect(orderByFocus(cards, ['quran', 'salat']).map((c) => c.id)).toEqual([
      'quran',
      'salat',
      'zikr',
      'fasting',
    ]);
  });
});

describe('local onboarded flag', () => {
  it('starts unset and sticks once marked', () => {
    expect(isOnboardedLocally()).toBe(false);
    markOnboardedLocally();
    expect(isOnboardedLocally()).toBe(true);
  });
});

describe('initialGoal', () => {
  it("keeps the user's current goal when it is an option", () => {
    expect(initialGoal(300, [33, 100, 300], 100)).toBe(300);
  });
  it('falls back for no goal or a custom one', () => {
    expect(initialGoal(undefined, [33, 100, 300], 100)).toBe(100);
    expect(initialGoal(0, [5, 10, 20], 5)).toBe(5);
    expect(initialGoal(500, [33, 100, 300], 100)).toBe(100);
  });
});
