import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { m as motion } from 'framer-motion';
import { ArrowPathIcon, BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../AnimatedBackground.js';
import { CARD, ITEM, REF_LINK, SECTION_TITLE } from '../bustanStyles.js';
import { CrescentIcon, FajrIcon, Star8Icon } from '../icons/IslamicIcons.js';
import RamadanSheetCard, { ramadanBasisText } from '../RamadanSheetCard.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { translateReference } from '../../utils/localeReference.js';
import { MEDALLION, formatGregorian, type Icon } from './ramadanShared.js';
import { type RamadanWindow } from '../../utils/ramadan.js';

export default function RamadanCountdown({
  window_,
  tabs,
  yearLabel,
}: {
  window_: RamadanWindow;
  tabs: ReactNode;
  yearLabel: string;
}) {
  const { t, i18n } = useTranslation();
  const startStr = window_.days[0]?.date;
  // What the date rests on, as the Ramadan calendars say it.
  const basisText = ramadanBasisText(t, i18n.language, window_);
  // A citation is drawn beside the row's link, not inside it: an <a> nested
  // in the row's <Link> is invalid HTML (React's validateDOMNesting warning).
  const prep: {
    to: string;
    Icon: Icon;
    label: ReactNode;
    cite?: { label: string; href: string };
  }[] = [
    { to: '/fasting', Icon: ArrowPathIcon, label: t('ramadan.clearQada') },
    {
      to: '/fasting',
      Icon: CrescentIcon,
      label: t('ramadan.warmUpShaban'),
      cite: {
        label: translateReference('Bukhārī 1969', i18n.language),
        href: 'https://sunnah.com/bukhari:1969',
      },
    },
    { to: '/quran', Icon: BookOpenIcon, label: t('ramadan.buildQuranHabit') },
  ];
  const virtues: { text: string; ref: string; href: string }[] = [
    {
      text: t('ramadan.fastingHadith'),
      ref: 'Bukhārī 1899',
      href: 'https://sunnah.com/bukhari:1899',
    },
    { text: t('ramadan.nightOfDecree'), ref: 'Quran 97:3', href: 'https://quran.com/97/3' },
    {
      text: t('ramadan.laylatAlQadrHadith'),
      ref: 'Bukhārī 1901',
      href: 'https://sunnah.com/bukhari:1901',
    },
  ];
  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('ramadan.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3">{tabs}</div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* The screen's one arch: the countdown */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 text-center space-y-2"
        >
          <span className={MEDALLION}>
            <CrescentIcon className="w-8 h-8" aria-hidden="true" />
          </span>
          <p className="text-brand-gold text-xs font-bold uppercase tracking-widest pt-1">
            {t('ramadan.ramadanYear', { year: yearLabel })} {t('hijriMonths.ah', 'AH')}
          </p>
          <h2 className="font-display text-5xl font-bold text-white tabular-nums">
            {formatLocaleNumber(window_.daysUntil)}
          </h2>
          <p className="text-white/80 text-sm font-semibold">
            {t('ramadan.daysAway', 'days away')}
          </p>
          {startStr && (
            <p className="text-white/70 text-xs">
              {t('ramadan.expectedAround', { date: formatGregorian(startStr) })}
            </p>
          )}
          {basisText && (
            <p className="text-white/70 text-xs max-w-md mx-auto leading-snug">{basisText}</p>
          )}
          <p className="text-white/85 text-sm pt-2 leading-relaxed max-w-md mx-auto">
            {t('ramadan.gatesHadith')}
            <br />
            <a
              className={REF_LINK}
              href="https://sunnah.com/bukhari:1899"
              target="_blank"
              rel="noreferrer"
            >
              {translateReference('Ṣaḥīḥ al-Bukhārī 1899', i18n.language)}
            </a>
          </p>
        </motion.section>

        <RamadanSheetCard window={window_} />

        <section className={`${CARD} p-5 space-y-3`}>
          <h2 className={SECTION_TITLE}>
            <FajrIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
            {t('ramadan.prepareHeart')}
          </h2>
          <div className="space-y-2 text-sm">
            {prep.map((p, i) => (
              <div key={i} className={`${ITEM} relative flex items-center gap-3`}>
                <p.Icon className="w-5 h-5 shrink-0 text-brand-emerald" aria-hidden="true" />
                <span className="flex-1 text-white/85 leading-snug">
                  {/* Stretched link: its ::after covers the whole row. */}
                  <Link to={p.to} className="after:absolute after:inset-0 after:content-['']">
                    {p.label}
                  </Link>
                  {p.cite && (
                    <>
                      {' '}
                      <a
                        className="relative z-10 text-brand-gold underline underline-offset-2"
                        href={p.cite.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.cite.label}
                      </a>
                    </>
                  )}
                </span>
                <span
                  className="flex items-center gap-0.5 text-brand-gold text-xs font-bold shrink-0"
                  aria-hidden="true"
                >
                  {t('ramadan.open')}
                  <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${CARD} p-5`}>
          <h2 className={`${SECTION_TITLE} mb-3`}>
            <Star8Icon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
            {t('ramadan.whyThisMonth')}
          </h2>
          <ul className="space-y-3">
            {virtues.map((v) => (
              <li key={v.href} className="flex gap-2.5 text-sm text-white/80 leading-relaxed">
                <span
                  className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {v.text}
                  <br />
                  <a className={REF_LINK} href={v.href} target="_blank" rel="noreferrer">
                    {translateReference(v.ref, i18n.language)}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AnimatedBackground>
  );
}
