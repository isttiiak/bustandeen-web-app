import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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

/**
 * The Khatam journey — a serial, self-paced read-through of the whole Quran.
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
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-10 grid place-items-center">
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-6 sm:p-8 border border-brand-emerald/25 bg-gradient-to-br from-brand-emerald/15 via-brand-info/10 to-brand-deep relative overflow-hidden"
            >
              <p className="text-brand-emerald/80 text-xs font-bold uppercase tracking-widest">
                {t('quranKhatam.journeyLabel')}
              </p>
              <h2 className="text-2xl font-black text-white mt-1">
                {pos && posMeta ? (
                  <>
                    {surahDisplayName(posMeta, i18n.language)}{' '}
                    <span className="text-white/40 text-base">
                      ·{' '}
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

              <div className="mt-4 h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-emerald to-brand-info"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-white/40 mt-1.5">
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
                    className="mt-5 w-full btn h-13 rounded-2xl border-0 text-white text-base font-black bg-gradient-to-r from-brand-emerald to-brand-info hover:from-brand-emerald hover:to-brand-info"
                    onClick={() => {
                      if (pos) navigate(`/quran/read/${pos.surah}?start=${pos.ayah}&mode=khatam`);
                    }}
                    disabled={!pos}
                  >
                    {t('quranKhatam.continueFrom', {
                      ref: pos
                        ? `${formatLocaleNumber(pos.surah)}:${formatLocaleNumber(pos.ayah)}`
                        : '…',
                    })}
                  </button>
                  <p className="text-white/30 text-[11px] text-center mt-2">
                    {t('quranKhatam.calmPace')}
                  </p>
                </>
              ) : (
                <>
                  <button
                    className="mt-5 w-full btn h-13 rounded-2xl border-0 text-white text-base font-black bg-gradient-to-r from-brand-emerald to-brand-info hover:from-brand-emerald hover:to-brand-info"
                    disabled={startKhatam.isPending}
                    onClick={() =>
                      startKhatam.mutate(undefined, {
                        onSuccess: () => navigate('/quran/read/1?start=1&mode=khatam'),
                      })
                    }
                  >
                    {t('quranKhatam.beginButton')}
                  </button>
                  <p className="text-white/30 text-[11px] text-center mt-2">
                    {t('quranKhatam.yourChoice')}
                  </p>
                </>
              )}
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center">
                <p className="text-2xl font-black text-brand-gold">
                  ⭐ {formatLocaleNumber(summary.profile.khatmCount)}
                </p>
                <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
                  {t('quranKhatam.khatmCompleted')}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center">
                <p className="text-2xl font-black text-brand-emerald">
                  {summary.pace != null ? formatLocaleNumber(summary.pace) : '—'}
                </p>
                <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
                  {t('quranKhatam.ayatPerDay')}
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
              <h3 className="text-white font-black text-sm mb-2">
                {t('quranKhatam.whyOrderTitle')}
              </h3>
              <p className="text-white/40 text-xs leading-relaxed">
                {t('quranKhatam.whyOrderBody')}
              </p>
              <p className="text-white/30 text-[11px] mt-2">
                {t('quranKhatam.reciteQuote')} —{' '}
                <a
                  className="underline"
                  href="https://quran.com/73/4"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Quran 73:4', i18n.language)}
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </AnimatedBackground>
  );
}
