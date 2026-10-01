import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.1: the two hooks in musafir.ts, run through a minimal stand-in for
// React (the suite runs in node, without a DOM renderer). useState returns
// its initial value and records every setState; useEffect queues the effect
// so the test runs it, and its cleanup, by hand.

type Effect = () => void | (() => void);
const harness = vi.hoisted(() => ({
  effects: [] as Effect[],
  sets: [] as unknown[],
}));

vi.mock('react', () => ({
  useState: <T>(init: T | (() => T)) => {
    const value = typeof init === 'function' ? (init as () => T)() : init;
    return [value, (next: T) => harness.sets.push(next)];
  },
  useEffect: (fn: Effect) => {
    harness.effects.push(fn);
  },
}));

const { useMusafir, useTravelHint, startMusafir, MUSAFIR_KEY } = await import('./musafir.js');

const DHAKA = { latitude: 23.81, longitude: 90.41, name: 'Dhaka' };
// About 214 km away: beyond the qaṣr distance of both schools.
const CHATTOGRAM = { latitude: 22.3569, longitude: 91.7832 };

let store: MemoryStorage;
beforeEach(() => {
  harness.effects.length = 0;
  harness.sets.length = 0;
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const runEffects = () => harness.effects.map((fn) => fn());
const flush = () => new Promise((r) => setTimeout(r, 0));

function stubNavigator(opts: {
  state?: PermissionState;
  coords?: { latitude: number; longitude: number };
  queryRejects?: boolean;
  positionFails?: boolean;
}) {
  const getCurrentPosition = vi.fn((ok: (p: { coords: unknown }) => void, fail: () => void) =>
    opts.positionFails ? fail() : ok({ coords: opts.coords ?? DHAKA })
  );
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition },
    permissions: {
      query: () =>
        opts.queryRejects
          ? Promise.reject(new Error('unsupported'))
          : Promise.resolve({ state: opts.state ?? 'granted' }),
    },
  });
  return getCurrentPosition;
}

describe('useMusafir', () => {
  it('starts from storage and re-reads on change, storage and focus events', () => {
    expect(useMusafir()).toBeNull();
    const [cleanup] = runEffects();
    startMusafir({ today: '2026-03-12', school: 'majority' }); // fires the change event
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('focus'));
    expect(harness.sets).toHaveLength(3);
    expect(harness.sets[0]).toMatchObject({ active: true, startedAt: '2026-03-12' });

    (cleanup as () => void)();
    window.dispatchEvent(new Event('focus'));
    expect(harness.sets).toHaveLength(3);
  });

  it('returns the stored journey on first render', () => {
    store.setItem(MUSAFIR_KEY, JSON.stringify({ active: true, startedAt: '2026-03-10' }));
    expect(useMusafir()).toMatchObject({ startedAt: '2026-03-10', school: 'majority' });
  });
});

describe('useTravelHint', () => {
  beforeEach(() => store.setItem('bustandeen_location', JSON.stringify(DHAKA)));

  it('suggests Musafir mode beyond the qaṣr distance, with permission already granted', async () => {
    stubNavigator({ coords: CHATTOGRAM });
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    expect(harness.sets).toEqual([{ km: 214, from: 'Dhaka' }]);
  });

  it('stays quiet near home', async () => {
    stubNavigator({ coords: { latitude: 23.9, longitude: 90.4 } });
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    expect(harness.sets).toEqual([]);
  });

  it('never asks for permission: no hint unless it is already granted', async () => {
    const getPos = stubNavigator({ state: 'prompt', coords: CHATTOGRAM });
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    expect(getPos).not.toHaveBeenCalled();
    expect(harness.sets).toEqual([]);
  });

  it('clears the hint while a journey is active', () => {
    stubNavigator({ coords: CHATTOGRAM });
    useTravelHint('2026-03-12', true);
    runEffects();
    expect(harness.sets).toEqual([null]);
  });

  it('respects a dismissal for the day', async () => {
    const getPos = stubNavigator({ coords: CHATTOGRAM });
    store.setItem('bustandeen_musafir_hint_dismissed', '2026-03-12');
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    expect(getPos).not.toHaveBeenCalled();
  });

  it('ignores a result that arrives after unmount', async () => {
    stubNavigator({ coords: CHATTOGRAM });
    useTravelHint('2026-03-12', false);
    const [cleanup] = runEffects();
    (cleanup as () => void)();
    await flush();
    expect(harness.sets).toEqual([]);
  });

  it.each([
    ['no saved location', () => store.removeItem('bustandeen_location')],
    [
      'a location without coordinates',
      () => store.setItem('bustandeen_location', JSON.stringify({ name: 'Dhaka' })),
    ],
    ['a corrupt location', () => store.setItem('bustandeen_location', '{bad')],
  ])('does nothing with %s', async (_l, setup) => {
    const getPos = stubNavigator({ coords: CHATTOGRAM });
    setup();
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    expect(getPos).not.toHaveBeenCalled();
  });

  it('handles an unsupported permissions API and a failed position quietly', async () => {
    stubNavigator({ queryRejects: true });
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    harness.effects.length = 0;
    stubNavigator({ positionFails: true });
    useTravelHint('2026-03-12', false);
    runEffects();
    await flush();
    expect(harness.sets).toEqual([]);
  });
});
