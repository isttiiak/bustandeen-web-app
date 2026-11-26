import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n, { i18nReady } from './i18n.js';

// The toasts with a placeholder must fill it in both languages (audit P4-3).
// The app loads Bangla on demand; here the file is added directly.

beforeAll(async () => {
  await i18nReady;
  const bn = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./locales/bn/common.json', import.meta.url)),
      'utf8'
    ).replace(/^\uFEFF/, '')
  );
  const ns = (i18n.options.defaultNS as string) || 'translation';
  i18n.addResourceBundle('bn', ns, bn, true, true);
});

describe('toast placeholders', () => {
  it('Settings danger-zone messages carry the row label', async () => {
    await i18nReady;
    await i18n.changeLanguage('en');
    expect(i18n.t('settings.toast.dangerDone', { label: 'All salat logs' })).toBe(
      'All salat logs: done.'
    );
    expect(i18n.t('settings.toast.dangerFail', { label: 'All salat logs' })).toBe(
      'Could not complete "All salat logs". Please try again.'
    );
    await i18n.changeLanguage('bn');
    expect(i18n.t('settings.toast.dangerDone', { label: 'All salat logs' })).toBe(
      'All salat logs: সম্পন্ন হয়েছে।'
    );
  });

  it('the Quran goal message carries the number, singular and plural', async () => {
    await i18nReady;
    await i18n.changeLanguage('en');
    expect(i18n.t('quranSettings.toast.goalSet', { count: '1' })).toBe('Daily goal set: 1 āyah');
    expect(i18n.t('quranSettings.toast.goalSetPlural', { count: '10' })).toBe(
      'Daily goal set: 10 āyahs'
    );
    await i18n.changeLanguage('bn');
    expect(i18n.t('quranSettings.toast.goalSetPlural', { count: '১০' })).toBe(
      'দৈনিক লক্ষ্য ঠিক হয়েছে: ১০টি আয়াত'
    );
  });

  it('the disabled-account message carries the support address', async () => {
    await i18nReady;
    await i18n.changeLanguage('en');
    expect(i18n.t('common.accountDisabled', { email: 'ansar@bustandeen.com' })).toContain(
      'ansar@bustandeen.com'
    );
    await i18n.changeLanguage('bn');
    expect(i18n.t('common.accountDisabled', { email: 'ansar@bustandeen.com' })).toContain(
      'ansar@bustandeen.com'
    );
    await i18n.changeLanguage('en');
  });
});
