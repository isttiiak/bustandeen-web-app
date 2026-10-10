import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HOME_GOALS_KEY,
  HOME_SECTIONS_OFF_KEY,
  getHomeGoals,
  goalOrder,
  goalRows,
  goalsCardShown,
  homeSections,
  isSectionOn,
  saveSetupHomeChoice,
  setHomeGoals,
  setSectionOn,
} from './homeSections.js';
import { FOCUS_KEY, HOME_TIMELINE_KEY } from './onboarding.js';
import {
  DEFAULT_QUICK_ZIKR,
  ZIKR_QUICK_KEY,
  counterHref,
  getQuickAction,
  getQuickZikr,
  parseTarget,
  setQuickAction,
  setQuickZikr,
} from './zikrQuick.js';
import { QURAN_LAST_KEY, continueHref, getLastRead, setLastRead } from './quranLastRead.js';
import { nextSunnahFast, quickFastPlan } from './fastingQuick.js';
import type { DayRuling } from './fastingRules.js';

// T3.4 E: Home quick sections (Quran, Zikr, Fasting) and their settings.

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

describe('homeSections', () => {
  it('shows all four in the habit order by default', () => {
    expect(homeSections()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
  });
  it('follows the saved order and the on/off switches', () => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(['fasting', 'quran', 'salat', 'zikr']));
    setSectionOn('quran', false);
    expect(homeSections()).toEqual(['fasting', 'salat', 'zikr']);
    setSectionOn('quran', true);
    expect(isSectionOn('quran')).toBe(true);
  });
  it('the Salat section is the timeline switch', () => {
    localStorage.setItem(HOME_TIMELINE_KEY, '0');
    expect(isSectionOn('salat')).toBe(false);
    expect(homeSections()).not.toContain('salat');
  });
  it('ignores junk in storage', () => {
    localStorage.setItem(HOME_SECTIONS_OFF_KEY, '["salat","nope"]');
    expect(homeSections()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
    localStorage.setItem(HOME_SECTIONS_OFF_KEY, '{bad');
    expect(isSectionOn('zikr')).toBe(true);
  });
});

describe("Today's goals card (U5)", () => {
  const allSectionsOff = () => {
    localStorage.setItem(HOME_TIMELINE_KEY, '0');
    localStorage.setItem(HOME_SECTIONS_OFF_KEY, '["zikr","quran","fasting"]');
  };

  it('defaults to on, every row, badges, in the habit order', () => {
    expect(getHomeGoals()).toEqual({ on: true, off: [], badges: true });
    localStorage.setItem(FOCUS_KEY, JSON.stringify(['quran', 'salat']));
    expect(goalRows()).toEqual(['quran', 'salat', 'zikr', 'fasting']);
    expect(goalsCardShown()).toBe(true);
  });
  it('keeps its own row order once moved, independent of the habit order', () => {
    setHomeGoals({ on: true, order: ['fasting', 'zikr', 'salat', 'quran'], off: [], badges: true });
    localStorage.setItem(FOCUS_KEY, JSON.stringify(['quran', 'salat', 'zikr', 'fasting']));
    expect(goalOrder()).toEqual(['fasting', 'zikr', 'salat', 'quran']);
    expect(homeSections()).toEqual(['quran', 'salat', 'zikr', 'fasting']);
  });
  it('hides switched-off rows but never empties the card', () => {
    setHomeGoals({ on: true, off: ['salat', 'fasting'], badges: false });
    expect(goalRows()).toEqual(['zikr', 'quran']);
    expect(getHomeGoals().badges).toBe(false);
    setHomeGoals({ on: true, off: ['salat', 'zikr', 'quran', 'fasting'], badges: true });
    expect(goalRows()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
  });
  it('off hides the card while a quick section is on', () => {
    setHomeGoals({ on: false, off: [], badges: true });
    expect(goalsCardShown()).toBe(false);
  });
  it('safety net: with every section off the card shows even if it is off', () => {
    allSectionsOff();
    expect(homeSections()).toEqual([]);
    setHomeGoals({ on: false, off: [], badges: true });
    expect(goalsCardShown()).toBe(true);
  });
  it('ignores junk and completes a partial order', () => {
    localStorage.setItem(HOME_GOALS_KEY, '{bad');
    expect(getHomeGoals()).toEqual({ on: true, off: [], badges: true });
    localStorage.setItem(
      HOME_GOALS_KEY,
      JSON.stringify({ on: 'x', order: ['zikr', 'nope', 'zikr'], off: ['nope', 'quran'] })
    );
    expect(getHomeGoals()).toEqual({
      on: true,
      order: ['zikr', 'salat', 'quran', 'fasting'],
      off: ['quran'],
      badges: true,
    });
    localStorage.setItem(HOME_GOALS_KEY, 'null');
    expect(getHomeGoals().on).toBe(true);
  });
});

describe('welcome setup Home choice (U5)', () => {
  const all = { salat: true, zikr: true, quran: true, fasting: true };
  it('saves the sections, independent of which habit is first', () => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(['zikr', 'salat', 'quran', 'fasting']));
    saveSetupHomeChoice({ ...all, quran: false }, false);
    expect(homeSections()).toEqual(['zikr', 'salat', 'fasting']);
    expect(getHomeGoals().on).toBe(false);
  });
  it('no section on keeps the goals card on', () => {
    saveSetupHomeChoice({ salat: false, zikr: false, quran: false, fasting: false }, false);
    expect(homeSections()).toEqual([]);
    expect(getHomeGoals().on).toBe(true);
  });
  it('goal rows follow the new habit order again; hidden rows and badges stay', () => {
    setHomeGoals({
      on: true,
      order: ['fasting', 'quran', 'zikr', 'salat'],
      off: ['zikr'],
      badges: false,
    });
    localStorage.setItem(FOCUS_KEY, JSON.stringify(['quran', 'salat', 'zikr', 'fasting']));
    saveSetupHomeChoice(all, true);
    expect(getHomeGoals()).toEqual({ on: true, off: ['zikr'], badges: false });
    expect(goalRows()).toEqual(['quran', 'salat', 'fasting']);
  });
});

describe('zikr quick chips', () => {
  it('defaults to istighfār, tahlīl and ṣalawāt, 100 each, opening the counter', () => {
    expect(getQuickZikr()).toEqual(DEFAULT_QUICK_ZIKR);
    expect(DEFAULT_QUICK_ZIKR.map((z) => z.count)).toEqual([100, 100, 100]);
    expect(getQuickAction()).toBe('open');
  });
  it('round-trips a choice and the add action', () => {
    setQuickZikr([
      { name: 'SubhanAllah', count: 33 },
      { name: 'Alhamdulillah', count: 33 },
      { name: 'Allahu Akbar', count: 34 },
    ]);
    expect(getQuickZikr().map((z) => z.count)).toEqual([33, 33, 34]);
    setQuickAction('add');
    expect(getQuickAction()).toBe('add');
  });
  it('a bad slot falls back to its default', () => {
    localStorage.setItem(
      ZIKR_QUICK_KEY,
      JSON.stringify([
        { name: 'SubhanAllah', count: 0 },
        { name: '', count: 5 },
      ])
    );
    expect(getQuickZikr()).toEqual(DEFAULT_QUICK_ZIKR);
  });
  it('builds and reads the counter link', () => {
    const href = counterHref({ name: 'La ilaha illallah', count: 100 });
    expect(href).toBe('/zikr?type=La%20ilaha%20illallah&target=100');
    const q = new URLSearchParams(href.split('?')[1]);
    expect(q.get('type')).toBe('La ilaha illallah');
    expect(parseTarget(q.get('target'))).toBe(100);
    expect(parseTarget(null)).toBeNull();
    expect(parseTarget('0')).toBeNull();
    expect(parseTarget('5000')).toBeNull();
  });
});

describe('Quran continue', () => {
  it('khatam on: continues the khatam journey', () => {
    expect(
      continueHref({
        khatamOn: true,
        khatamPos: { surah: 18, ayah: 24 },
        last: { surah: 36, ayah: 5 },
      })
    ).toBe('/quran/read/18?start=24&mode=khatam');
  });
  it('khatam on before the position is known: the Khatam page', () => {
    expect(continueHref({ khatamOn: true, khatamPos: null, last: { surah: 36, ayah: 5 } })).toBe(
      '/quran/khatam'
    );
  });
  it('khatam off: the last thing read, anywhere', () => {
    setLastRead({ surah: 36, ayah: 5 });
    expect(getLastRead()).toEqual({ surah: 36, ayah: 5 });
    expect(continueHref({ khatamOn: false, khatamPos: null, last: getLastRead() })).toBe(
      '/quran/read/36?start=5'
    );
  });
  it('nothing read yet: no continue link; junk is ignored', () => {
    expect(continueHref({ khatamOn: false, khatamPos: null, last: null })).toBeNull();
    localStorage.setItem(QURAN_LAST_KEY, '{"surah":200,"ayah":1}');
    expect(getLastRead()).toBeNull();
  });
});

describe('quickFastPlan (reads the Fasting page engine, no new ruling)', () => {
  const base: DayRuling = { level: 'normal', recommended: [], cautions: [], hijriLabel: null };
  it('a normal day logs a general voluntary fast', () => {
    expect(quickFastPlan(base)).toEqual({ kind: 'log', voluntaryKind: 'general' });
  });
  it("uses the day's best sunnah kind, as the Fasting page preselects", () => {
    const r = { ...base, recommended: [{ id: 'mon_thu' }] } as unknown as DayRuling;
    expect(quickFastPlan(r)).toEqual({ kind: 'log', voluntaryKind: 'mon_thu' });
  });
  it('prohibited, Ramadan and caution days never log in one tap', () => {
    expect(
      quickFastPlan({
        ...base,
        level: 'haram',
        haram: { id: 'eid_fitr', title: 'Eid', detail: '', refs: [] },
      })
    ).toEqual({ kind: 'haram', title: 'Eid' });
    expect(quickFastPlan({ ...base, level: 'ramadan' })).toEqual({ kind: 'ramadan' });
    const friday = { ...base, cautions: [{ id: 'friday_alone' }] } as unknown as DayRuling;
    expect(quickFastPlan(friday)).toEqual({ kind: 'caution' });
  });
});

describe('nextSunnahFast', () => {
  it('finds the next Monday/Thursday from tomorrow on', () => {
    // Thursday 2026-10-15: tomorrow (Fri) and Sat/Sun have no sunnah fast.
    const next = nextSunnahFast(new Date('2026-10-15T12:00:00+06:00'));
    expect(next?.kind).toBe('mon_thu');
    expect(next?.date.getDate()).toBe(19);
  });
});
