import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import i18nSource from './i18n.ts?raw';
import en from './locales/en/common.json';

// i18next 27 (audit P3-6): an empty translation falls back like a missing one
// unless `returnEmptyString: true`. The locale files keep deliberate empty
// strings, so the app's init must opt in, or those would show English or a key.

describe('empty translations', () => {
  it('the app keeps returnEmptyString on', () => {
    expect(i18nSource).toMatch(/returnEmptyString:\s*true/);
  });

  it('there are deliberate empty strings in the locale files', () => {
    expect(JSON.stringify(en)).toContain('""');
  });

  it('with the option on, an empty value stays empty; off, it falls back', async () => {
    const make = async (returnEmptyString: boolean) => {
      const i = createInstance();
      await i.init({
        lng: 'bn',
        fallbackLng: 'en',
        returnEmptyString,
        resources: { en: { translation: { k: 'English' } }, bn: { translation: { k: '' } } },
      });
      return i.t('k');
    };
    expect(await make(true)).toBe('');
    expect(await make(false)).toBe('English');
  });
});
