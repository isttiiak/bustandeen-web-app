import { describe, expect, it } from 'vitest';
import { CONSENT_COPY, consentLang } from './consentBanner.js';

// The banner itself is plain DOM (checked in a browser); what can go wrong in a unit is the words.

describe('consent banner copy', () => {
  const languages = ['en', 'bn', 'ar'] as const;

  it.each(languages)('%s has every line, none empty', (lang) => {
    for (const [key, value] of Object.entries(CONSENT_COPY[lang])) {
      expect(value.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
    }
  });

  it.each(languages)('%s uses no em dash (house style)', (lang) => {
    expect(JSON.stringify(CONSENT_COPY[lang])).not.toContain('—');
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
  it('a page that names Bangla or Arabic keeps it, whatever the app has saved', () => {
    expect(consentLang('bn', 'en')).toBe('bn');
    expect(consentLang('ar-SA', 'bn')).toBe('ar');
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
