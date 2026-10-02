// Client side of the prerendered SEO pages (audit PERF-01), loaded by
// src/static-entry.ts instead of the whole app. Most of these pages are
// complete as prerendered HTML and get no JavaScript at all. Only the ones
// that depend on today's date or are interactive are rendered again here,
// with the same template and the same props as the build
// (src/seo/entry-server.tsx), which scripts/prerender.mjs embeds in the page
// as <script type="application/json" id="seo-page">. Nothing else from the
// app (router, Firebase, React Query, i18next, framer-motion) is loaded.

import { createRoot } from 'react-dom/client';
import type { CityEntry } from './data/cities.js';
import type { SeoLang } from './locales/chrome.js';
import { currentHijriYear, ramadanRangeForHijriYear } from './utils/calc.js';

/** What prerender.mjs embeds for a page that needs the client. */
export type SeoClientPage =
  | { kind: 'prayer-times'; city: CityEntry }
  | { kind: 'ramadan-calendar-index' }
  | { kind: 'hijri-converter' }
  | { kind: 'asma-ul-husna' }
  | { kind: 'zakat-calculator' };

async function pageElement(page: SeoClientPage, lang: SeoLang) {
  switch (page.kind) {
    case 'prayer-times': {
      const { default: Page } = await import('./templates/PrayerTimesCityPage.js');
      return <Page lang={lang} city={page.city} buildDate={new Date()} />;
    }
    case 'ramadan-calendar-index': {
      const { default: Page } = await import('./templates/RamadanCalendarIndexPage.js');
      const gregorianYear = ramadanRangeForHijriYear(currentHijriYear()).start.getUTCFullYear();
      return <Page lang={lang} gregorianYear={gregorianYear} />;
    }
    case 'hijri-converter': {
      const { default: Page } = await import('./templates/HijriConverterPage.js');
      return <Page lang={lang} buildDate={new Date()} />;
    }
    case 'asma-ul-husna': {
      const { default: Page } = await import('./templates/AsmaUlHusnaPage.js');
      return <Page lang={lang} />;
    }
    case 'zakat-calculator': {
      const { default: Page } = await import('./templates/ZakatCalculatorPage.js');
      return <Page lang={lang} />;
    }
  }
}

export async function renderSeoPage(): Promise<void> {
  const data = document.getElementById('seo-page')?.textContent;
  const root = document.getElementById('root');
  if (!data || !root) return; // a fully static page: nothing to do
  const page = JSON.parse(data) as SeoClientPage;
  const lang = (document.documentElement.lang || 'en') as SeoLang;
  // createRoot, like the app did for these pages: the prerendered markup is
  // replaced in one commit by the same template rendered for today.
  createRoot(root).render(await pageElement(page, lang));
}
