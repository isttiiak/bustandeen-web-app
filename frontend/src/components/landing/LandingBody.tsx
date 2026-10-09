import type { ComponentType, ReactNode } from 'react';
import {
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  EyeSlashIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  CrescentIcon,
  DuaHandsIcon,
  FajrIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  TasbihIcon,
} from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from '../bustanStyles.js';
import { translateReference } from '../../utils/localeReference.js';
import LandingSeoSections, { type LandingT } from '../LandingSeoSections.js';

// The landing page body in the Bustan Arch design (audit T3.2), shared by the
// prerendered `/` and `/bn` (seo/templates/LandingPage.tsx, what signed-out
// visitors get) and the in-app Landing (pages/Landing.tsx, shown when the app
// itself answers `/` for a guest). Pure: no hooks, strings through the `t` it
// is given, links through `A` (plain <a> in the static page, the router's Link
// in the app). Theme tokens only: the static page is `data-static` (dark), the
// app page follows the visitor's theme.

export type LandingLink = ComponentType<{ href: string; className?: string; children: ReactNode }>;

const BIG = 'h-12 px-8 text-base';
const BADGE =
  'w-11 h-11 shrink-0 rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald';
const H2 = 'font-display text-white font-bold text-2xl sm:text-3xl';
const H3 = 'font-display text-white font-bold text-lg';
const BODY = 'text-white/80 text-sm leading-relaxed';
const LINK_CARD = `${CARD} block p-6 h-full transition-colors hover:border-brand-emerald/40`;
const MORE = 'inline-flex items-center gap-1 mt-3 text-xs font-semibold';

const FEATURES = [
  { key: 'Salat', href: '/salat', Icon: MosqueIcon },
  { key: 'Zikr', href: '/zikr', Icon: TasbihIcon },
  { key: 'Quran', href: '/quran', Icon: BookOpenIcon },
  { key: 'Fasting', href: '/fasting', Icon: CrescentIcon },
  { key: 'Prayer', href: '/prayer-times', Icon: ClockIcon },
  { key: 'Friends', href: '/friends', Icon: UserGroupIcon },
] as const;

const PRIVACY = [
  { key: 'Encrypted', Icon: LockClosedIcon },
  { key: 'Partner', Icon: EyeSlashIcon },
  { key: 'AiKey', Icon: KeyIcon },
] as const;

export default function LandingBody({
  t,
  lang,
  A,
}: {
  t: LandingT;
  lang: 'en' | 'bn';
  A: LandingLink;
}) {
  return (
    <div className="space-y-12">
      {/* The one arch hero of the page. */}
      <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-12 pb-8 sm:px-12 sm:pt-16 text-center">
        <div className={`${BADGE} w-16 h-16 mx-auto mb-5`}>
          <LeafIcon className="w-8 h-8" />
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-bold text-white leading-tight">
          {t('landing.heroTitle1', 'Worship,')}{' '}
          <span className="text-brand-emerald">{t('landing.heroTitle2', 'beautifully kept')}</span>
        </h1>
        <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed">
          {t('landing.heroDesc', '')}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <A href="/signup" className={`${BTN_PRIMARY} ${BIG}`}>
            {t('landing.cta', 'Begin your journey, free')}
          </A>
          <A href="/zikr" className={`${BTN_SECONDARY} ${BIG}`}>
            {t('landing.ctaCounter', 'Try the counter first')}
          </A>
        </div>
        {/* Demo mode: /demo/:as (an app route) enters it and opens Home. */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <A href="/demo/brother" className={BTN_SECONDARY}>
            <MosqueIcon className="w-4 h-4 text-brand-emerald" />
            {t('landing.exploreAsBrother', 'Explore as Brother')}
          </A>
          <A href="/demo/sister" className={BTN_SECONDARY}>
            <FlowerIcon className="w-4 h-4 text-brand-pink" />
            {t('landing.exploreAsSister', 'Explore as Sister')}
          </A>
        </div>
        <p className="text-white/70 text-xs mt-5">{t('landing.noAds', '')}</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ key, href, Icon }) => (
          <A key={key} href={href} className={LINK_CARD}>
            <div className={`${BADGE} mb-4`}>
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className={H3}>{t(`landing.feature${key}`, '')}</h2>
            <p className={`${BODY} mt-2`}>{t(`landing.feature${key}Desc`, '')}</p>
            <span className={`${MORE} text-brand-emerald`}>
              {t('landing.tryIt', 'Try it')}
              <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </A>
        ))}
      </section>

      <A href="/cycle" className={`${LINK_CARD} sm:p-10 sm:flex items-start gap-8`}>
        <div className="w-16 h-16 shrink-0 rounded-full grid place-items-center bg-brand-pink/10 border border-brand-pink/30 text-brand-pink mb-4 sm:mb-0">
          <FlowerIcon className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <p className="text-brand-pink text-xs font-bold uppercase tracking-wide">
            {t('landing.rayhanahHighlight', '')}
          </p>
          <h2 className={`${H2} mt-2`}>{t('landing.rayhanahTitle', '')}</h2>
          <p className={`${BODY} sm:text-base mt-3 max-w-2xl`}>
            {t('landing.rayhanahDesc', '')}
            <span className="font-bold text-brand-pink">{t('landing.rayhanahPrivate', '')}</span>
          </p>
          <span className={`${MORE} text-brand-pink`}>
            {t('landing.tryIt', 'Try it')}
            <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </div>
      </A>

      <section className={`${CARD} p-6 sm:p-10`}>
        <div className="text-center mb-8">
          <div className={`${BADGE} mx-auto mb-4`}>
            <ShieldCheckIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className={H2}>{t('landing.privacyTitle', '')}</h2>
          <p className={`${BODY} sm:text-base mt-3 max-w-2xl mx-auto`}>
            {t('landing.privacyDesc', '')}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {PRIVACY.map(({ key, Icon }) => (
            <div
              key={key}
              className="rounded-control border border-brand-border bg-brand-surface/50 p-5"
            >
              <Icon className="w-6 h-6 text-brand-emerald mb-2" aria-hidden="true" />
              <h3 className="text-white font-bold text-sm">
                {t(`landing.privacy${key}Title`, '')}
              </h3>
              <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
                {t(`landing.privacy${key}Desc`, '')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className={`${CARD} p-6`}>
          <div className={`${BADGE} mb-4 text-brand-gold border-brand-gold/30 bg-brand-gold/10`}>
            <ShieldCheckIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className={H3}>{t('landing.verifiedTitle', '')}</h2>
          <p className={`${BODY} mt-2`}>{t('landing.verifiedDesc', '')}</p>
        </div>
        <div className={`${CARD} p-6`}>
          <div className={`${BADGE} mb-4`}>
            <FajrIcon className="w-6 h-6" />
          </div>
          <h2 className={H3}>{t('landing.fajrTitle', '')}</h2>
          <p className={`${BODY} mt-2`}>{t('landing.fajrDesc', '')}</p>
        </div>
      </section>

      <A href="/sadaqah" className={`${LINK_CARD} sm:p-8 text-center`}>
        <div
          className={`${BADGE} mx-auto mb-4 text-brand-gold border-brand-gold/30 bg-brand-gold/10`}
        >
          <DuaHandsIcon className="w-6 h-6" />
        </div>
        <h2 className={H3}>{t('landing.sadaqahTitle', '')}</h2>
        <p className={`${BODY} mt-2 max-w-xl mx-auto`}>{t('landing.sadaqahDesc', '')}</p>
        <span className={`${MORE} text-brand-gold`}>
          {t('landing.sadaqahCta', 'Learn more')}
          <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </A>

      <LandingSeoSections t={t} prefix={lang === 'bn' ? '/bn' : ''} />

      <section className="text-center pt-2">
        <p className="font-display text-2xl sm:text-3xl font-bold text-white">
          &ldquo;{t('landing.finalQuote', 'So compete with one another in doing good.')}&rdquo;
        </p>
        <a
          className="inline-block mt-2 text-white/70 text-sm underline underline-offset-2 hover:text-white"
          href="https://quran.com/2/148"
          target="_blank"
          rel="noreferrer"
        >
          {translateReference('Quran 2:148', lang)}
        </a>
        <div className="flex flex-wrap justify-center gap-3 mt-7">
          <A href="/signup" className={`${BTN_PRIMARY} ${BIG}`}>
            {t('landing.finalCta', 'Create your free account')}
          </A>
          <A href="/about" className={`${BTN_SECONDARY} ${BIG}`}>
            {t('landing.readOurStory', 'Read our story')}
          </A>
        </div>
        <p className="text-white/70 text-xs mt-6">{t('footer.platformNote', '')}</p>
      </section>
    </div>
  );
}
