import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import sheet from './SignInSheet.tsx?raw';
import gate from './PreviewGate.tsx?raw';
import guestPage from './GuestFeaturePage.tsx?raw';
import note from './zikr/ZikrGuestNote.tsx?raw';
import routes from '../routes.tsx?raw';
import salat from '../pages/SalatTracker.tsx?raw';
import fasting from '../pages/FastingTracker.tsx?raw';
import zikr from '../pages/ZikrCounter.tsx?raw';
import app from '../App.tsx?raw';
import habit from '../pages/QuranHabit.tsx?raw';
import khatam from '../pages/QuranKhatam.tsx?raw';
import hifz from '../pages/QuranHifz.tsx?raw';
import reader from '../pages/QuranReader.tsx?raw';
import ramadan from '../pages/RamadanTracker.tsx?raw';
import ramadanSalat from './RamadanSalatCard.tsx?raw';

// U10 "explore freely, sign in to save": one shared SignInSheet for every
// first save, a PreviewGate instead of the lock card, Rayhanah and Friends
// view only, and a zikr note that never interrupts counting.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}/u;
type Dict = Record<string, unknown>;
const strings = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : Object.values(o as Dict).flatMap(strings);

describe('U10 sign-in gate', () => {
  it('the trackers use the shared sheet, each with its own reason', () => {
    expect(salat).toMatch(/<SignInSheet[\s\S]*?feature="salat"/);
    expect(fasting).toMatch(/<SignInSheet[\s\S]*?feature="fasting"/);
    expect(zikr).toMatch(/<SignInSheet[\s\S]*?feature="zikr"/);
    for (const page of [salat, fasting, zikr])
      expect(page).not.toMatch(/\b(Salat|Fasting|Zikr)GuestDialog\b/);
  });

  it('the sheet is a portaled, labelled dialog that keeps the return path', () => {
    expect(sheet).toMatch(/createPortal\(/);
    expect(sheet).toMatch(/role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby=/);
    expect(sheet).toContain(
      "sessionStorage.setItem('bustandeen_redirect', location.pathname + location.search)"
    );
    expect(sheet).toContain("'Escape'");
  });

  it('every action is a 44px target', () => {
    for (const code of [sheet, gate, guestPage, note]) {
      // Each <button ...> up to its first className.
      const buttons = code
        .split('<button')
        .slice(1)
        .map((b) => b.split('className=')[1]?.split('\n')[0]);
      expect(buttons.length).toBeGreaterThan(0);
      for (const b of buttons) expect(b).toMatch(/min-h-\[(44|56)px\]/);
    }
  });

  it('Rayhanah and Friends are view only for a guest; nothing else is opened up', () => {
    expect(routes).toMatch(
      /<Protected guest={<GuestFeaturePage feature="friends" \/>}>\s*<Friends \/>/
    );
    expect(routes).toMatch(
      /<Protected guest={<GuestFeaturePage feature="rayhanah" \/>}>\s*<RayhanahCycle \/>/
    );
    // Plus the Quran habit pages and Ramadan, open until the first save (below).
    expect(routes.match(/guest={/g)).toHaveLength(7);
    // The guest page never calls the API or keeps an entry.
    expect(guestPage).not.toMatch(/\bhooks\/|api\.|localStorage/);
  });

  it('the Quran habit pages and Ramadan are open; the first save opens the sheet', () => {
    for (const page of [
      'QuranHabit',
      'QuranKhatam',
      'QuranBookmarks',
      'QuranHifz',
      'RamadanTracker',
    ])
      expect(routes).toMatch(
        new RegExp(`<Protected guest={<${page} />}>\\s*<${page} />\\s*</Protected>`)
      );
    for (const page of [habit, khatam, hifz, reader]) {
      expect(page).toContain("useSignInGate('quran')");
      expect(page).toContain('{gate.sheet}');
    }
    // Every write on these pages checks first.
    expect(habit.match(/gate\.canSave\(\) &&/g)).toHaveLength(2);
    expect(khatam).toMatch(/gate\.canSave\(\) &&\s*startKhatam\.mutate/);
    expect(hifz.match(/gate\.canSave\(\)/g)).toHaveLength(2);
    expect(reader).toMatch(/gate\.canSave\(\) &&\s*toggleBookmark\.mutate/);
    expect(ramadan).toContain("useSignInGate('ramadan')");
    expect(ramadan).toContain('canSave={gate.canSave}');
    expect(ramadan).not.toMatch(/if \(!user\) return null/);
    expect(ramadan.match(/if \(!gate\.canSave\(\)\) return;/g)).toHaveLength(2);
    expect(ramadanSalat.match(/if \(!canSave\(\)\) return;/g)).toHaveLength(5);
    expect(ramadanSalat.match(/\.mutate\(/g)).toHaveLength(5);
  });

  it('the zikr page no longer asks "Leave site?" (a guest\'s counts are kept)', () => {
    expect(zikr).not.toContain('beforeunload');
  });

  it('a guest\'s taps survive Firebase\'s "no user" (only a session ending wipes them)', () => {
    const onNull = app.slice(app.indexOf('if (!u) {'), app.indexOf('clearSalatOutbox();'));
    expect(onNull).toMatch(
      /const endingSession = hasSessionHint\(\) \|\| !!useAuthStore\.getState\(\)\.user;/
    );
    expect(onNull).toMatch(/if \(endingSession\) \{\s*resetAll\(\);/);
  });

  it('the zikr note sits below Count, so it never moves the button', () => {
    expect(zikr.indexOf('<ZikrGuestNote')).toBeGreaterThan(zikr.indexOf("t('zikr.countBtn'"));
    expect(zikr).toMatch(/!user && pendingTotal > 0 && \(\s*<ZikrGuestNote/);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: every sheet, gate and note string exists, with no em dash', (_l, dict) => {
    const g = (dict as unknown as { signInGate: Record<string, Record<string, unknown>> })
      .signInGate;
    for (const f of [
      'salat',
      'fasting',
      'zikr',
      'rayhanah',
      'quran',
      'ramadan',
      'friends',
      'analytics',
      'page',
    ])
      expect(g[f]?.title, f).toBeTruthy();
    for (const f of ['rayhanah', 'friends'])
      expect(Object.keys(g[f]!.points as Dict)).toHaveLength(3);
    const all = strings(g);
    expect(all.length).toBeGreaterThan(30);
    expect(all.filter((v) => DASH_OR_EMOJI.test(v))).toEqual([]);
    expect(g.zikrNote).toContain('{{n}}');
  });

  it('Bangla copy is in Bangla script', () => {
    const g = (bn as unknown as { signInGate: Dict }).signInGate;
    for (const v of strings(g).filter((s) => !s.includes('{{'))) expect(v, v).toMatch(/[ঀ-৿]/);
  });
});
