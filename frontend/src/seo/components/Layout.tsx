import type { ReactNode } from 'react';
import type { SeoLang } from '../locales/chrome.js';
import { CHROME, RTL_LANGS, SEO_LANGS } from '../locales/chrome.js';

const LANG_LABEL: Record<SeoLang, string> = { en: 'EN', bn: 'বাং', ar: 'عربي' };

// Deliberately not importing AnimatedBackground, Zustand, Firebase or
// React Query — this whole src/seo/ tree is rendered server-side via
// react-dom/server (see scripts/prerender.mjs) and must stay dependency-
// light and SSR-safe. Plain CSS gradient instead of the canvas-driven
// in-app background.

export function langPath(lang: SeoLang, path: string): string {
  return lang === 'en' ? path : `/${lang}${path}`;
}

interface BreadcrumbItem {
  label: string;
  path?: string; // omit for the current (last) crumb
}

interface LayoutProps {
  lang: SeoLang;
  /** Unprefixed (English-canonical) path for the current page, e.g.
   * `/duas/travel` — used to build the language-switcher links so switching
   * language keeps you on the equivalent page instead of bouncing to home. */
  barePath: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
  /** Languages this page exists in (default: all three). */
  langs?: readonly SeoLang[];
  /** 'bustan': the app's Bustan Arch tokens, dark or light (T4.4 pages);
   * default: the original slate SEO palette, dark only. */
  look?: 'slate' | 'bustan';
}

const LOOKS = {
  slate: {
    page: 'min-h-screen bg-[#080c12] text-[#f1f5f9]',
    header: 'border-b border-[#1e2d42]',
    logo: 'text-[#f1f5f9]',
    langOn: 'bg-[#10b981] text-[#080c12]',
    langOff: 'text-[#94a3b8] border border-[#1e2d42] hover:text-[#10b981]',
    muted: 'text-[#94a3b8]',
    link: 'hover:text-[#10b981]',
    current: 'text-[#f1f5f9]',
    footer: 'border-t border-[#1e2d42]',
  },
  bustan: {
    page: 'min-h-screen bg-brand-void text-white',
    header: 'border-b border-brand-border',
    logo: 'text-white font-display',
    langOn: 'bg-brand-emerald-dim text-on-color',
    langOff: 'text-white/70 border border-brand-border hover:text-brand-emerald',
    muted: 'text-white/70',
    link: 'hover:text-brand-emerald',
    current: 'text-white',
    footer: 'border-t border-brand-border',
  },
} as const;

export default function Layout({
  lang,
  barePath,
  breadcrumbs,
  children,
  langs = SEO_LANGS,
  look = 'slate',
}: LayoutProps) {
  const t = CHROME[lang];
  const s = LOOKS[look];
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';

  return (
    <div
      dir={dir}
      className={s.page}
      // static-entry.ts applies the visitor's light/dark theme to these pages.
      data-follow-theme={look === 'bustan' ? '' : undefined}
    >
      {look === 'slate' && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 20% 10%, rgba(16,185,129,0.15), transparent), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(245,158,11,0.08), transparent)',
          }}
        />
      )}
      <div className="relative">
        <header className={s.header}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <a
              href="https://bustandeen.com/"
              className={`flex items-center gap-2 font-black text-lg no-underline ${s.logo}`}
            >
              {look === 'bustan' ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5 text-brand-gold"
                >
                  <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
                  <path d="M5 19l7-7" />
                </svg>
              ) : (
                <span aria-hidden>🌙</span>
              )}{' '}
              {t.siteName}
            </a>
            <nav aria-label={t.languageLabel} className="flex items-center gap-1.5">
              {langs.map((l) => (
                <a
                  key={l}
                  href={langPath(l, barePath)}
                  aria-current={l === lang ? 'page' : undefined}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold no-underline ${
                    l === lang ? s.langOn : s.langOff
                  }`}
                >
                  {LANG_LABEL[l]}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <nav
          aria-label="Breadcrumb"
          className={`max-w-3xl mx-auto px-4 sm:px-6 pt-4 text-xs ${s.muted}`}
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.path ? (
                  // inline-flex: touch screens give links a 44px tap height
                  // (global.css); this keeps the label level with the "/".
                  <a
                    href={crumb.path}
                    className={`inline-flex items-center no-underline ${s.link}`}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className={s.current}>{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-16">{children}</main>

        <footer className={`mt-12 ${s.footer}`}>
          <div className={`max-w-3xl mx-auto px-4 sm:px-6 py-8 text-xs space-y-2 ${s.muted}`}>
            <p>
              {t.siteName} - {t.tagline}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a href={langPath(lang, '/prayer-times')} className={`no-underline ${s.link}`}>
                {t.breadcrumbPrayerTimes}
              </a>
              <a href={langPath(lang, '/qibla')} className={`no-underline ${s.link}`}>
                {t.breadcrumbQibla}
              </a>
              <a href={langPath(lang, '/ramadan-calendar')} className={`no-underline ${s.link}`}>
                {t.breadcrumbRamadan}
              </a>
              <a href={langPath(lang, '/duas')} className={`no-underline ${s.link}`}>
                {t.breadcrumbDuas}
              </a>
              <a href={langPath(lang, '/adhkar/morning')} className={`no-underline ${s.link}`}>
                {t.breadcrumbAdhkar}
              </a>
              <a
                href={langPath(lang, '/hijri-date-converter')}
                className={`no-underline ${s.link}`}
              >
                {t.breadcrumbHijri}
              </a>
              <a href={langPath(lang, '/asma-ul-husna')} className={`no-underline ${s.link}`}>
                {t.breadcrumbAsmaUlHusna}
              </a>
              <a href={langPath(lang, '/zakat-calculator')} className={`no-underline ${s.link}`}>
                {t.breadcrumbZakat}
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
