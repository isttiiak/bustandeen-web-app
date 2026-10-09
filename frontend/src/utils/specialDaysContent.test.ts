import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import { SPECIAL_DAYS } from './islamicCalendar.js';

// Special-day content (en + bn locales and the English SPECIAL_DAYS fallbacks):
// no em dashes, and the words themselves stay exactly as they were when the
// dashes were replaced (2026-10-09). The fingerprints below hash each day's
// words with punctuation and case removed, so a punctuation-only edit keeps
// them; changing a word fails here on purpose. Religious text: re-verify the
// source before updating a fingerprint.
type Dict = Record<string, unknown>;

const strings = (v: unknown): string[] =>
  typeof v === 'string'
    ? [v]
    : v && typeof v === 'object'
      ? Object.values(v as Dict).flatMap(strings)
      : [];

const fnv1a = (s: string) => {
  let h = 0x811c9dc5;
  for (const c of s) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

const wordsFingerprint = (v: unknown) =>
  fnv1a(
    strings(v)
      .join(' ')
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
      .trim()
      .toLowerCase()
  );

const FINGERPRINTS = {
  en: {
    arafah: '9aa794a7',
    ashura: '45f26ec3',
    ayyam_al_bid: '6367346e',
    dhul_hijjah_first10: 'ab0ac40d',
    eid_adha: '45e163cc',
    eid_fitr: 'e5049ad9',
    fast_mon_thu: 'bddd02e4',
    friday: '03713dea',
    islamic_new_year: 'b32b49f8',
    laylat_qadr: '0f0c3039',
    shab_e_barat: '905ca13b',
    typeBadge: '5bfd8f7e',
  },
  bn: {
    arafah: '030c931b',
    ashura: 'f5a954ee',
    ayyam_al_bid: 'c7270a69',
    dhul_hijjah_first10: '30f585bf',
    eid_adha: 'df65baf6',
    eid_fitr: '9b50bb8c',
    fast_mon_thu: 'fb992a62',
    friday: '0844a997',
    islamic_new_year: '32540f2b',
    laylat_qadr: '15a9807e',
    shab_e_barat: '72b2caae',
    typeBadge: '6ccd5a4d',
  },
} as const;

describe('special-day content', () => {
  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: no em dash in any specialDays string', (_l, dict) => {
    for (const s of strings(dict.specialDays)) expect(s).not.toContain('—');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: words unchanged (punctuation-only edits)', (lang, dict) => {
    const sd = dict.specialDays as Dict;
    const got = Object.fromEntries(
      Object.keys(FINGERPRINTS[lang]).map((k) => [k, wordsFingerprint(sd[k])])
    );
    expect(got).toEqual(FINGERPRINTS[lang]);
  });

  it('SPECIAL_DAYS fallbacks have no em dash or emoji icon', () => {
    for (const day of SPECIAL_DAYS) {
      for (const s of strings(day)) expect(s).not.toContain('—');
      expect(day).not.toHaveProperty('icon');
      for (const todo of day.todos) expect(todo).not.toHaveProperty('icon');
    }
  });

  it('SPECIAL_DAYS fallbacks match the English locale', () => {
    const sd = en.specialDays as unknown as Record<string, unknown>;
    for (const day of SPECIAL_DAYS) {
      const loc = sd[day.id] as {
        name: string;
        shortDesc: string;
        significance: string;
        todos: { action: string; note?: string }[];
        references: { text: string }[];
      };
      expect(day.name).toBe(loc.name);
      expect(day.shortDesc).toBe(loc.shortDesc);
      expect(day.significance).toBe(loc.significance);
      day.todos.forEach((t, i) => {
        expect(t.action).toBe(loc.todos[i].action);
        if (t.note) expect(t.note).toBe(loc.todos[i].note);
      });
      day.references.forEach((r, i) => expect(r.text).toBe(loc.references[i].text));
    }
  });
});
