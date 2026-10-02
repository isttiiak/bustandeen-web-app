import i18n from '../i18n.js';

/**
 * Locale-aware date formatting so month/weekday names AND numerals follow the
 * app's selected language (বাংলা digits ০১২৩... in Bengali mode). Use in
 * place of `date.toLocaleDateString('en-US', ...)`.
 */
const INTL_LOCALE: Record<string, string> = {
  en: 'en-US',
  bn: 'bn',
};

export function formatLocaleDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  const lang = (i18n.language || 'en').split('-')[0]!;
  return date.toLocaleDateString(INTL_LOCALE[lang] ?? 'en-US', options);
}

export function formatLocaleTime(date: Date, options: Intl.DateTimeFormatOptions): string {
  const lang = (i18n.language || 'en').split('-')[0]!;
  return date.toLocaleTimeString(INTL_LOCALE[lang] ?? 'en-US', options);
}

/** Locale-aware number formatting — বাংলা digits (০১২৩...) in Bengali mode.
 * Pass { useGrouping: false } for years (1448, not 1,448). */
export function formatLocaleNumber(n: number, options?: Intl.NumberFormatOptions): string {
  const lang = (i18n.language || 'en').split('-')[0]!;
  return n.toLocaleString(INTL_LOCALE[lang] ?? 'en-US', options);
}
