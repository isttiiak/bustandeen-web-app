import { afterEach, describe, expect, it } from 'vitest';
import i18n from './i18n.js';

// Audit UX-05: numbers interpolated into Bangla strings use Bangla digits;
// English output is unchanged.

afterEach(async () => {
  await i18n.changeLanguage('en');
});

const t = (s: string, vars: Record<string, unknown>) => i18n.t(s, vars);

describe('numbers in translations', () => {
  it('Bangla: a plain {{count}} gets Bangla digits', async () => {
    await i18n.changeLanguage('bn');
    expect(t('Count {{n}}', { n: 33 })).toBe('Count ৩৩');
    expect(t('Year {{y}}', { y: 1447 })).toBe('Year ১৪৪৭');
    expect(t('Total {{n}}', { n: 14250 })).toBe('Total ১৪,২৫০');
  });

  it('Bangla: strings and named formats are left alone', async () => {
    await i18n.changeLanguage('bn');
    expect(t('Hi {{name}}', { name: 'Abdullah 2' })).toBe('Hi Abdullah 2');
    expect(t('{{n, number}}', { n: 7 })).toBe('৭');
  });

  it('a real key still interpolates (sadaqahDonate.charCount)', async () => {
    await i18n.changeLanguage('bn');
    expect(i18n.t('sadaqahDonate.charCount', { count: 12 })).toContain('১২');
    await i18n.changeLanguage('en');
    expect(i18n.t('sadaqahDonate.charCount', { count: 12 })).toContain('12');
  });

  it('English output is unchanged', async () => {
    await i18n.changeLanguage('en');
    expect(t('Count {{n}}', { n: 33 })).toBe('Count 33');
    expect(t('Year {{y}}', { y: 2026 })).toBe('Year 2026');
    expect(t('Total {{n}}', { n: 14250 })).toBe('Total 14250');
  });

  it('survives a language switch (the interpolator is reset)', async () => {
    await i18n.changeLanguage('bn');
    await i18n.changeLanguage('en');
    await i18n.changeLanguage('bn');
    expect(t('{{n}}', { n: 5 })).toBe('৫');
  });
});
