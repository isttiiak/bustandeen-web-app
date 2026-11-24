import { describe, expect, it } from 'vitest';
import { CONSENT_COPY, consentLang } from './consentBanner.js';

// The banner itself is plain DOM (checked in a browser); what can go wrong in a unit is the words.

describe('consent banner copy', () => {
  const languages = ['en', 'bn'] as const;

  it.each(languages)('%s has every line, none empty', (lang) => {
    for (const [key, value] of Object.entries(CONSENT_COPY[lang])) {
      expect(value.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
    }
  });

  it.each(languages)('%s uses no em dash (house style)', (lang) => {
    expect(JSON.stringify(CONSENT_COPY[lang])).not.toContain('—');
  });

  it('has English and Bangla only (the Arabic text was never reviewed by a native reader)', () => {
    expect(Object.keys(CONSENT_COPY).sort()).toEqual(['bn', 'en']);
  });

  it('Bangla is in Bangla script and says no to nothing in English letters', () => {
    expect(CONSENT_COPY.bn.allow).toMatch(/[ঀ-৿]/);
    expect(CONSENT_COPY.bn.deny).toMatch(/[ঀ-৿]/);
    expect(CONSENT_COPY.bn.body).toMatch(/[ঀ-৿]/);
  });

  it('Allow and No thanks are different words in every language', () => {
    for (const lang of languages)
      expect(CONSENT_COPY[lang].allow).not.toBe(CONSENT_COPY[lang].deny);
  });
});

describe('consentLang', () => {
  it('a page that names Bangla keeps it, whatever the app has saved', () => {
    expect(consentLang('bn', 'en')).toBe('bn');
  });

  it('Arabic is not offered: an ar page or saved value falls back to English or the saved choice', () => {
    expect(consentLang('ar-SA', null)).toBe('en');
    expect(consentLang('ar', 'bn')).toBe('bn');
    expect(consentLang('en', 'ar')).toBe('en');
  });

  it('on an English page the saved app language wins (the app leaves <html lang> at en)', () => {
    expect(consentLang('en', 'bn')).toBe('bn');
    expect(consentLang('', 'bn')).toBe('bn');
  });

  it('falls back to English', () => {
    expect(consentLang('en', null)).toBe('en');
    expect(consentLang('fr', 'de')).toBe('en');
    expect(consentLang(undefined, null)).toBe('en');
  });
});
