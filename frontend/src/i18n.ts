import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/common.json';
import bn from './locales/bn/common.json';

/**
 * Multilingual support (v4.11.0) — English default + বাংলা.
 *
 * CONTRIBUTOR GUIDE: to translate, copy `src/locales/en/common.json` to
 * `src/locales/<lang>/common.json`, translate the VALUES only (never the
 * keys), and register the language below + in Settings' language picker.
 * Quran/hadith references and Arabic text are intentionally NOT in these
 * files — evidence must never pass through a translation layer.
 *
 * Untranslated keys automatically fall back to English, so partial
 * translations are always safe to ship.
 */
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'বাংলা (Bengali)' },
] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      bn: { common: bn },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    // escapeValue: false — React escapes already. i18next ships a built-in
    // Intl.NumberFormat-backed `number` formatter, so any `{{value, number}}`
    // placeholder already renders বাংলা digits (০১২৩...) in Bengali mode with
    // no extra config here — see utils/localeDate.ts#formatLocaleNumber for
    // the equivalent for raw (non-interpolated) JSX-rendered numbers.
    // alwaysFormat: every placeholder passes through the formatter, so a
    // plain `{{count}}` also gets বাংলা digits in Bengali (see below).
    interpolation: { escapeValue: false, alwaysFormat: true },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bustandeen_lang',
      caches: ['localStorage'],
    },
  });

/**
 * Bangla numerals for numbers interpolated WITHOUT a format (audit UX-05):
 * `{{count}}` used to print Latin digits inside Bangla sentences. Numbers in
 * Bengali become ০১২৩...; everything else (English, strings, named formats)
 * goes to i18next's own formatter unchanged. Grouping only from 10,000 up, so
 * a year or a count like ১৪৪৭ is never written "১,৪৪৭".
 */
const bnNumber = (n: number) =>
  new Intl.NumberFormat('bn-BD', { useGrouping: Math.abs(n) >= 10_000 }).format(n);

type FormatFn = (
  value: unknown,
  format: string | undefined,
  lng: string | undefined,
  options?: object
) => unknown;
// The `format` hook is no longer in i18next's public types, but the runtime
// still binds its formatter there and reads it back (Interpolator.init).
const interpolationOptions = i18n.options.interpolation as { format?: FormatFn } | undefined;
const builtInFormat = interpolationOptions?.format;
const format: FormatFn = (value, fmt, lng, options) => {
  if (!fmt && typeof value === 'number' && Number.isFinite(value) && lng?.startsWith('bn')) {
    return bnNumber(value);
  }
  return builtInFormat ? builtInFormat(value, fmt, lng, options) : value;
};
// i18next re-reads options.interpolation.format whenever it resets its
// interpolator, and the live interpolator holds its own copy.
if (interpolationOptions) interpolationOptions.format = format;
if (i18n.services.interpolator)
  (i18n.services.interpolator as unknown as { format: FormatFn }).format = format;

export default i18n;
