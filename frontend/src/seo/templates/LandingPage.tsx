import en from '../../locales/en/common.json';
import bn from '../../locales/bn/common.json';
import { type LandingT } from '../../components/LandingSeoSections.js';
import LandingBody, { type LandingLink } from '../../components/landing/LandingBody.js';
import { LeafIcon } from '../../components/icons/IslamicIcons.js';
import { BTN_PRIMARY } from '../../components/bustanStyles.js';

// The prerendered `/` (audit SEO-01). Written into dist/index.html by
// scripts/prerender.mjs, so crawlers and first-time visitors get real content
// before any JavaScript runs; the React Landing (pages/Landing.tsx) replaces
// it once the app loads. Both render components/landing/LandingBody.tsx with
// the same copy (read from the app's own locale file), so the hand-over is
// calm rather than a jump to a different page.
// Signed-in visitors never see it: index.html hides [data-prerendered-landing]
// when a session exists.
// Since audit PERF-01 this IS the landing for signed-out visitors: the app is
// not loaded on it (src/static-entry.ts), so everything here is plain links.
// `/bn` is the same page in Bangla.

export type LandingLang = 'en' | 'bn';

function lookup(strings: unknown, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      strings
    );
  return typeof value === 'string' ? value : undefined;
}

export const enT: LandingT = (key, fallback) => lookup(en, key) ?? fallback;

/** Bangla where translated, English otherwise (as i18next does in the app). */
const bnT: LandingT = (key, fallback) => lookup(bn, key) ?? enT(key, fallback);

export const landingT = (lang: LandingLang): LandingT => (lang === 'bn' ? bnT : enT);

/** Plain links: the static page has no router. */
const PlainLink: LandingLink = ({ href, className, children }) => (
  <a href={href} className={`${className ?? ''} no-underline`}>
    {children}
  </a>
);

export default function LandingPage({ lang = 'en' }: { lang?: LandingLang }) {
  const t = landingT(lang);
  return (
    <div data-prerendered-landing className="min-h-screen bg-brand-void text-white">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-brand-border">
        <a
          href={lang === 'bn' ? '/bn' : '/'}
          className="flex items-center gap-2 font-display text-xl font-bold text-brand-emerald no-underline"
        >
          <LeafIcon className="w-6 h-6" /> Bustandeen
        </a>
        <div className="flex items-center gap-3">
          {lang === 'bn' ? (
            <a
              href="/"
              hrefLang="en"
              lang="en"
              data-set-lang="en"
              className="inline-flex items-center text-white/80 hover:text-white text-sm font-semibold no-underline"
            >
              English
            </a>
          ) : (
            <a
              href="/bn"
              hrefLang="bn"
              lang="bn"
              data-set-lang="bn"
              // The system's Bangla font: this one word must not pull the
              // Hind Siliguri web font into the English page.
              style={{ fontFamily: 'system-ui, sans-serif' }}
              className="inline-flex items-center text-white/80 hover:text-white text-sm font-semibold no-underline"
            >
              বাংলা
            </a>
          )}
          <a href="/login" className={`${BTN_PRIMARY} py-1.5 no-underline`}>
            {t('nav.signIn', 'Sign In')}
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-20">
        <LandingBody t={t} lang={lang} A={PlainLink} />
        <p className="mt-6 text-center text-white/70 text-sm">
          <a href="/privacy" className="underline underline-offset-2 hover:text-white">
            {t('nav.privacy', 'Privacy')}
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/terms" className="underline underline-offset-2 hover:text-white">
            {t('nav.terms', 'Terms')}
          </a>
        </p>
      </main>
    </div>
  );
}
