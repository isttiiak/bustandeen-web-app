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
}

export default function Layout({ lang, barePath, breadcrumbs, children }: LayoutProps) {
  const t = CHROME[lang];
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="min-h-screen bg-[#080c12] text-[#f1f5f9]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 20% 10%, rgba(16,185,129,0.15), transparent), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(245,158,11,0.08), transparent)',
        }}
      />
      <div className="relative">
        <header className="border-b border-[#1e2d42]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <a
              href="https://bustandeen.com/"
              className="flex items-center gap-2 font-black text-lg text-[#f1f5f9] no-underline"
            >
              <span aria-hidden>🌙</span> {t.siteName}
            </a>
            <nav aria-label={t.languageLabel} className="flex items-center gap-1.5">
              {SEO_LANGS.map((l) => (
                <a
                  key={l}
                  href={langPath(l, barePath)}
                  aria-current={l === lang ? 'page' : undefined}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold no-underline ${
                    l === lang
                      ? 'bg-[#10b981] text-[#080c12]'
                      : 'text-[#94a3b8] border border-[#1e2d42] hover:text-[#10b981]'
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
          className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 text-xs text-[#94a3b8]"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.path ? (
                  <a href={crumb.path} className="hover:text-[#10b981] no-underline">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[#f1f5f9]">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-16">{children}</main>

        <footer className="border-t border-[#1e2d42] mt-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-xs text-[#94a3b8] space-y-2">
            <p>
              {t.siteName} - {t.tagline}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href={langPath(lang, '/prayer-times')}
                className="hover:text-[#10b981] no-underline"
              >
                {t.breadcrumbPrayerTimes}
              </a>
              <a href={langPath(lang, '/qibla')} className="hover:text-[#10b981] no-underline">
                {t.breadcrumbQibla}
              </a>
              <a
                href={langPath(lang, '/ramadan-calendar')}
                className="hover:text-[#10b981] no-underline"
              >
                {t.breadcrumbRamadan}
              </a>
              <a href={langPath(lang, '/duas')} className="hover:text-[#10b981] no-underline">
                {t.breadcrumbDuas}
              </a>
              <a
                href={langPath(lang, '/adhkar/morning')}
                className="hover:text-[#10b981] no-underline"
              >
                {t.breadcrumbAdhkar}
              </a>
              <a
                href={langPath(lang, '/hijri-date-converter')}
                className="hover:text-[#10b981] no-underline"
              >
                {t.breadcrumbHijri}
              </a>
              <a
                href={langPath(lang, '/asma-ul-husna')}
                className="hover:text-[#10b981] no-underline"
              >
                {t.breadcrumbAsmaUlHusna}
              </a>
              <a
                href={langPath(lang, '/zakat-calculator')}
                className="hover:text-[#10b981] no-underline"
              >
                {t.breadcrumbZakat}
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
