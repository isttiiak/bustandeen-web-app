import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import { useQuranSummary, useStartKhatam, QURAN_TOTAL_AYAT } from '../hooks/useQuran.js';
import {
  loadSurahList,
  locateGlobalAyah,
  juzOf,
  surahDisplayName,
  type SurahMeta,
} from '../utils/quranData.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { Star8Icon } from '../components/icons/IslamicIcons.js';
import { BTN_PRIMARY, CARD, SECTION_TITLE, TILE } from '../components/quran/quranStyles.js';

/**
 * The Khatam journey: a serial, self-paced read-through of the whole Quran.
 * Scholars across the madhāhib prefer reading in order (tartīb) for a khatam;
 * this tab owns that journey while the Read tab stays free for any surah.
 */
export default function QuranKhatam() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useQuranSummary();
  const startKhatam = useStartKhatam();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  // Opt-in (Istiak's spec): the journey exists only after the user begins it.
  const khatamStarted =
    !!summary?.profile.khatamStartedAt || (summary?.profile.currentAyah ?? 0) > 0;

  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((l) => {
        if (alive) setSurahs(l);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pos = useMemo(() => {
    if (!summary || !surahs.length) return null;
    return locateGlobalAyah(summary.profile.currentAyah, surahs);
  }, [summary, surahs]);

  const posMeta = pos ? surahs.find((s) => s.number === pos.surah) : null;
  const pct = summary ? (summary.profile.currentAyah / QURAN_TOTAL_AYAT) * 100 : 0;

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranKhatam.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="khatam" />

        {isLoading || !summary ? (
          <div className={`${CARD} p-10 grid place-items-center`}>
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-12 pb-6 sm:px-8 text-center"
            >
              <Star8Icon className="w-7 h-7 mx-auto text-brand-gold" aria-hidden="true" />
              <p className="mt-2 text-brand-emerald text-xs font-bold uppercase tracking-widest">
                {t('quranKhatam.journeyLabel')}
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-1">
                {pos && posMeta ? (
                  <>
                    {surahDisplayName(posMeta, i18n.language)}{' '}
                    <span className="block font-sans text-white/70 text-sm font-semibold mt-1">
                      {t('quranKhatam.ayahOfTotal', {
                        ayah: formatLocaleNumber(pos.ayah),
                        total: formatLocaleNumber(posMeta.numberOfAyahs),
                      })}{' '}
                      · {t('quranReader.juz', 'Juz')}{' '}
                      {formatLocaleNumber(juzOf(pos.surah, pos.ayah))}
                    </span>
                  </>
                ) : (
                  t('quranKhatam.beginJourneyHeading')
                )}
              </h2>

              <div className="mt-5 h-3 rounded-full bg-track overflow-hidden text-left">
                <motion.div
                  className="h-full rounded-full bg-data-good"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <div className="flex justify-between gap-3 text-[11px] text-white/70 mt-1.5 text-left">
                <span>
                  {formatLocaleNumber(summary.profile.currentAyah)} /{' '}
                  {formatLocaleNumber(QURAN_TOTAL_AYAT)} {t('quranKhatam.ayatLabel')} ·{' '}
                  {formatLocaleNumber(Number(pct.toFixed(1)))}%
                </span>
                <span>
                  {summary.estDaysToKhatm
                    ? t('quranKhatam.estDays', { days: formatLocaleNumber(summary.estDaysToKhatm) })
                    : t('quranKhatam.readFewDays')}
                </span>
              </div>

              {khatamStarted ? (
                <>
                  <button
                    className={`mt-5 w-full py-3 text-base ${BTN_PRIMARY}`}
                    onClick={() => {
                      if (pos) navigate(`/quran/read/${pos.surah}?start=${pos.ayah}&mode=khatam`);
                    }}
                    disabled={!pos}
                  >
                    <BookOpenIcon className="w-5 h-5" aria-hidden="true" />
                    {t('quranKhatam.continueFrom', {
                      ref: pos
                        ? `${formatLocaleNumber(pos.surah)}:${formatLocaleNumber(pos.ayah)}`
                        : '…',
                    })}
                  </button>
                  <p className="text-white/60 text-xs text-center mt-2">
                    {t('quranKhatam.calmPace')}
                  </p>
                </>
              ) : (
                <>
                  <button
                    className={`mt-5 w-full py-3 text-base ${BTN_PRIMARY}`}
                    disabled={startKhatam.isPending}
                    onClick={() =>
                      startKhatam.mutate(undefined, {
                        onSuccess: () => navigate('/quran/read/1?start=1&mode=khatam'),
                      })
                    }
                  >
                    <BookOpenIcon className="w-5 h-5" aria-hidden="true" />
                    {t('quranKhatam.beginButton')}
                  </button>
                  <p className="text-white/60 text-xs text-center mt-2">
                    {t('quranKhatam.yourChoice')}
                  </p>
                </>
              )}
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              <div className={TILE}>
                <p className="font-display text-2xl font-bold text-brand-gold flex items-center justify-center gap-1.5">
                  <Star8Icon className="w-5 h-5" aria-hidden="true" />
                  {formatLocaleNumber(summary.profile.khatmCount)}
                </p>
                <p className="text-white/60 text-[10px] font-bold uppercase mt-1">
                  {t('quranKhatam.khatmCompleted')}
                </p>
              </div>
              <div className={TILE}>
                <p className="font-display text-2xl font-bold text-brand-emerald">
                  {summary.pace != null ? formatLocaleNumber(summary.pace) : '-'}
                </p>
                <p className="text-white/60 text-[10px] font-bold uppercase mt-1">
                  {t('quranKhatam.ayatPerDay')}
                </p>
              </div>
            </div>

            <div className={`${CARD} p-5`}>
              <h3 className={`${SECTION_TITLE} mb-2`}>
                <BookOpenIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                {t('quranKhatam.whyOrderTitle')}
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {t('quranKhatam.whyOrderBody')}
              </p>
              {/* Abu Umamah, Sahih Muslim 804 (checked on sunnah.com). It was
                  mis-cited as Quran 73:4 before v5.92.0. */}
              <p className="text-white/60 text-xs mt-3">
                {t('quranKhatam.reciteQuote')} (
                <a
                  className="underline"
                  href="https://sunnah.com/muslim:804a"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Ṣaḥīḥ Muslim 804', i18n.language)}
                </a>
                )
              </p>
            </div>
          </>
        )}
      </div>
    </AnimatedBackground>
  );
}
