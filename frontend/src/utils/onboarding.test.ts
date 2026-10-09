import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOCUS_KEY,
  MAX_HABITS,
  getFocusHabits,
  initialGoal,
  isOnboardedLocally,
  markOnboardedLocally,
  onboardingMode,
  orderByFocus,
  setFocusHabits,
  toggleHabit,
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

describe('focus habits', () => {
  it('round-trips in the order picked', () => {
    setFocusHabits(['quran', 'salat']);
    expect(getFocusHabits()).toEqual(['quran', 'salat']);
  });
  it('drops unknown values, duplicates and anything past the cap', () => {
    localStorage.setItem(
      FOCUS_KEY,
      JSON.stringify(['zikr', 'cycle', 'zikr', 'salat', 'quran', 'fasting'])
    );
    expect(getFocusHabits()).toEqual(['zikr', 'salat', 'quran']);
    expect(getFocusHabits()).toHaveLength(MAX_HABITS);
  });
  it('survives a corrupt value', () => {
    localStorage.setItem(FOCUS_KEY, '{oops');
    expect(getFocusHabits()).toEqual([]);
    localStorage.setItem(FOCUS_KEY, '"salat"');
    expect(getFocusHabits()).toEqual([]);
  });
  it('toggles, and never adds a fourth', () => {
    let h = toggleHabit([], 'salat');
    h = toggleHabit(h, 'zikr');
    h = toggleHabit(h, 'quran');
    expect(toggleHabit(h, 'fasting')).toEqual(['salat', 'zikr', 'quran']);
    expect(toggleHabit(h, 'zikr')).toEqual(['salat', 'quran']);
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
