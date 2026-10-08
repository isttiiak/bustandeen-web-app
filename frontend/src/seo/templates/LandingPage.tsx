import en from '../../locales/en/common.json';
import bn from '../../locales/bn/common.json';
import LandingSeoSections, { type LandingT } from '../../components/LandingSeoSections.js';

// The prerendered `/` (audit SEO-01). Written into dist/index.html by
// scripts/prerender.mjs, so crawlers and first-time visitors get real content
// before any JavaScript runs; the React Landing (pages/Landing.tsx) replaces
// it once the app loads. It mirrors that page's hero and cards with the same
// classes and the same English copy (read from the app's own locale file), so
// the hand-over is calm rather than a jump to a different page.
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

const FEATURES = [
  {
    emoji: '🕌',
    key: 'Salat',
    href: '/salat',
    border: 'border-brand-info/25',
    grad: 'from-brand-info/20 to-brand-warm/10',
  },
  {
    emoji: '📿',
    key: 'Zikr',
    href: '/zikr',
    border: 'border-brand-emerald/25',
    grad: 'from-brand-emerald/20 to-brand-info/10',
  },
  {
    emoji: '📖',
    key: 'Quran',
    href: '/quran',
    border: 'border-brand-info/25',
    grad: 'from-brand-info/20 to-brand-info/10',
  },
  {
    emoji: '🌙',
    key: 'Fasting',
    href: '/fasting',
    border: 'border-brand-gold/25',
    grad: 'from-brand-gold/20 to-brand-warm/10',
  },
  {
    emoji: '🕐',
    key: 'Prayer',
    href: '/prayer-times',
    border: 'border-brand-info/25',
    grad: 'from-brand-info/20 to-brand-info/10',
  },
  {
    emoji: '🤝',
    key: 'Friends',
    href: '/friends',
    border: 'border-brand-pink/25',
    grad: 'from-brand-pink/20 to-brand-warm/10',
  },
];

export default function LandingPage({ lang = 'en' }: { lang?: LandingLang }) {
  const t = landingT(lang);
  return (
    <div data-prerendered-landing className="min-h-screen bg-brand-void text-white">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-brand-border">
        <a
          href={lang === 'bn' ? '/bn' : '/'}
          className="flex items-center gap-2 font-black text-white no-underline"
        >
          <span aria-hidden>🌙</span> Bustandeen
        </a>
        <div className="flex items-center gap-3">
          {lang === 'bn' ? (
            <a
              href="/"
              hrefLang="en"
              lang="en"
              data-set-lang="en"
              className="inline-flex items-center text-white/60 text-sm font-semibold no-underline"
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
              className="inline-flex items-center text-white/60 text-sm font-semibold no-underline"
            >
              বাংলা
            </a>
          )}
          <a
            href="/login"
            className="px-4 py-1.5 rounded-xl bg-brand-emerald text-brand-void text-sm font-bold no-underline"
          >
            {t('nav.signIn', 'Sign In')}
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <section className="text-center pt-14 sm:pt-20 pb-10">
          <div className="text-7xl mb-5" aria-hidden>
            🌙
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
            {t('landing.heroTitle1', 'Worship,')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-emerald to-brand-info">
              {t('landing.heroTitle2', 'beautifully kept')}
            </span>
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed">
            {t('landing.heroDesc', '')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/signup"
              className="inline-flex items-center h-13 px-10 rounded-2xl text-on-color text-base font-black bg-gradient-to-r from-brand-emerald-dim to-brand-info-dim no-underline"
            >
              {t('landing.cta', 'Begin your journey, free')}
            </a>
            <a
              href="/zikr"
              className="inline-flex items-center h-13 px-6 rounded-2xl bg-white/5 border border-brand-emerald/15 text-white/70 font-bold no-underline"
            >
              {t('landing.ctaCounter', 'Try the counter first')}
            </a>
          </div>
          {/* Demo mode: /demo/:as (an app route) enters it and opens Home. */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <a
              href="/demo/brother"
              className="inline-flex items-center h-10 px-5 rounded-xl bg-brand-info/10 border border-brand-info/20 text-white/70 text-sm font-semibold no-underline"
            >
              🕌 {t('landing.exploreAsBrother', 'Explore as Brother')}
            </a>
            <a
              href="/demo/sister"
              className="inline-flex items-center h-10 px-5 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-white/70 text-sm font-semibold no-underline"
            >
              🌸 {t('landing.exploreAsSister', 'Explore as Sister')}
            </a>
          </div>
          <p className="text-white/25 text-xs mt-4">{t('landing.noAds', '')}</p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {FEATURES.map((f) => (
            <a
              key={f.key}
              href={f.href}
              className={`block rounded-3xl border ${f.border} bg-gradient-to-br ${f.grad} p-6 no-underline`}
            >
              <div className="text-4xl mb-3" aria-hidden>
                {f.emoji}
              </div>
              <h2 className="text-white font-black text-lg">{t(`landing.feature${f.key}`, '')}</h2>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                {t(`landing.feature${f.key}Desc`, '')}
              </p>
            </a>
          ))}
        </section>

        <section className="mb-12 rounded-3xl p-6 sm:p-10 border border-brand-pink/25 bg-gradient-to-br from-brand-pink/15 via-brand-pink/10 to-brand-warm/10">
          <p className="text-brand-pink text-xs font-bold uppercase tracking-wide">
            {t('landing.rayhanahHighlight', '')}
          </p>
          <h2 className="text-white font-black text-2xl mt-2">{t('landing.rayhanahTitle', '')}</h2>
          <p className="text-white/60 text-sm sm:text-base mt-3 leading-relaxed">
            {t('landing.rayhanahDesc', '')}
            <span className="font-bold text-brand-pink">{t('landing.rayhanahPrivate', '')}</span>
          </p>
        </section>

        <section className="mb-12 grid sm:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-brand-emerald/20 bg-white/[0.04] p-6">
            <h2 className="text-white font-black text-lg">{t('landing.verifiedTitle', '')}</h2>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              {t('landing.verifiedDesc', '')}
            </p>
          </div>
          <div className="rounded-3xl border border-brand-gold/20 bg-white/[0.04] p-6">
            <h2 className="text-white font-black text-lg">{t('landing.fajrTitle', '')}</h2>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              {t('landing.fajrDesc', '')}
            </p>
          </div>
        </section>

        <LandingSeoSections t={t} prefix={lang === 'bn' ? '/bn' : ''} />

        <section className="text-center mt-14">
          <a
            href="/signup"
            className="inline-flex items-center h-13 px-10 rounded-2xl text-on-color text-base font-black bg-gradient-to-r from-brand-emerald-dim to-brand-info-dim no-underline"
          >
            {t('landing.finalCta', 'Create your free account')}
          </a>
          <p className="mt-4">
            <a href="/about" className="text-white/50 text-sm underline">
              {t('landing.readOurStory', 'Read our story')}
            </a>{' '}
            ·{' '}
            <a href="/privacy" className="text-white/50 text-sm underline">
              {t('nav.privacy', 'Privacy')}
            </a>{' '}
            ·{' '}
            <a href="/terms" className="text-white/50 text-sm underline">
              {t('nav.terms', 'Terms')}
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
