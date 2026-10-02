import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import {
  useQuranSummary,
  useStartKhatam,
  useToggleDuaBookmark,
  QURAN_TOTAL_AYAT,
} from '../hooks/useQuran.js';
import {
  loadSurahList,
  locateGlobalAyah,
  surahDisplayName,
  type SurahMeta,
} from '../utils/quranData.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import { SPECIAL_SURAHS, AYAH_BUNDLES, QURANIC_DUAS } from '../utils/quranMeta.js';
import {
  BookOpenIcon,
  BookmarkIcon,
  FireIcon,
  QueueListIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { DuaHandsIcon, Star8Icon } from '../components/icons/IslamicIcons.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  ITEM,
  REF_LINK,
  SECTION_TITLE,
} from '../components/bustanStyles.js';

const RING = 2 * Math.PI * 42;

/**
 * Quran home (v4), the overview room. Manual page input is GONE (Istiak's
 * spec): reading happens in the ayah reader (Khatam/Read tabs), listening in
 * the Listen tab, and everything flows into ONE daily ayat goal + streak.
 */
export default function QuranHabit() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useQuranSummary();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);

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

  // Deep link from a finished duʿā: /quran#duas lands on the dua section
  useEffect(() => {
    if (window.location.hash === '#duas') {
      const t = setTimeout(
        () =>
          document.getElementById('duas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        250
      );
      return () => clearTimeout(t);
    }
  }, []);

  const startKhatam = useStartKhatam();
  const toggleDua = useToggleDuaBookmark();
  const nameOf = (n: number) => {
    const s = surahs.find((s) => s.number === n);
    return s ? surahDisplayName(s, i18n.language) : `Surah ${n}`;
  };
  // Goal is OPT-IN (0 = not set); khatam starts only when the user says so.
  const goal = summary?.profile.dailyGoalAyat ?? 0;
  const today = summary?.todayAyat ?? 0;
  const pct = goal > 0 ? Math.min(100, (today / goal) * 100) : 0;
  const khatamStarted =
    !!summary?.profile.khatamStartedAt || (summary?.profile.currentAyah ?? 0) > 0;
  const savedDuas = summary?.profile.savedDuas ?? [];
  const khatmPct = summary ? (summary.profile.currentAyah / QURAN_TOTAL_AYAT) * 100 : 0;
  const pos = useMemo(
    () => (summary && surahs.length ? locateGlobalAyah(summary.profile.currentAyah, surahs) : null),
    [summary, surahs]
  );
  const maxLast7 = Math.max(1, ...(summary?.last7 ?? []).map((d) => d.units));

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranHabit.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-5">
        <QuranTabNav active="home" />

        {/* ── The screen's one arch: today's reading ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center"
        >
          <div className="relative w-28 h-28 mx-auto">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-track"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-data-good"
                strokeDasharray={RING}
                initial={{ strokeDashoffset: RING }}
                animate={{ strokeDashoffset: RING * (1 - pct / 100) }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <p className="font-display text-3xl font-bold text-white leading-none tabular-nums">
                  {isLoading ? '…' : formatLocaleNumber(today)}
                </p>
                <p className="text-[10px] text-white/60 font-bold mt-1">
                  {goal > 0
                    ? t('quranHabit.ofGoal', { goal: formatLocaleNumber(goal) })
                    : t('quranHabit.ayatToday')}
                </p>
              </div>
            </div>
          </div>
          <h2 className="font-display text-xl font-bold text-white mt-4">
            {summary?.goalMet ? t('quranHabit.goalReached') : t('quranHabit.todaysReading')}
          </h2>
          <p className="text-white/70 text-sm mt-1 leading-relaxed max-w-sm mx-auto">
            {goal > 0 ? t('quranHabit.allCountAsOne') : t('quranHabit.noGoalYet')}
          </p>
          <div className="flex flex-col sm:flex-row sm:justify-center gap-2 mt-5">
            {khatamStarted ? (
              <button
                className={BTN_PRIMARY}
                onClick={() => {
                  if (pos) navigate(`/quran/read/${pos.surah}?start=${pos.ayah}&mode=khatam`);
                  else navigate('/quran/khatam');
                }}
              >
                <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
                {t('quranHabit.continueKhatam')}
              </button>
            ) : (
              <button
                className={BTN_PRIMARY}
                disabled={startKhatam.isPending}
                onClick={() =>
                  startKhatam.mutate(undefined, { onSuccess: () => navigate('/quran/khatam') })
                }
              >
                <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
                {t('quranHabit.beginKhatam')}
              </button>
            )}
            <Link to="/quran/browse" className={BTN_SECONDARY}>
              <QueueListIcon className="w-4 h-4" aria-hidden="true" />
              {t('quranHabit.pickSurah')}
            </Link>
          </div>
        </motion.section>

        {/* ── streak + khatam ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`${CARD} p-4`}>
            <p className="text-white font-bold text-sm flex items-center gap-1.5">
              <FireIcon className="w-4 h-4 text-brand-warm shrink-0" aria-hidden="true" />
              {t('quranHabit.dayStreak', { count: formatLocaleNumber(summary?.streak ?? 0) })}
            </p>
            <div className="flex items-end gap-1 h-10 mt-3">
              {(summary?.last7 ?? []).map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.units} ayat`}
                  className={`flex-1 rounded-t ${d.units > 0 ? 'bg-data-mid' : 'bg-track'}`}
                  style={{ height: `${Math.max(10, (d.units / maxLast7) * 100)}%` }}
                />
              ))}
            </div>
            <p className="text-white/60 text-[11px] mt-1.5">
              {t('quranHabit.bestStreak', { count: formatLocaleNumber(summary?.bestStreak ?? 0) })}
            </p>
          </div>
          <Link
            to="/quran/khatam"
            className={`${CARD} p-4 hover:border-brand-emerald/40 hover:shadow-hover transition`}
          >
            <p className="text-white font-bold text-sm flex items-center gap-1.5">
              <Star8Icon className="w-4 h-4 text-brand-emerald shrink-0" aria-hidden="true" />
              {t('quranHabit.khatamPct', { pct: formatLocaleNumber(Number(khatmPct.toFixed(1))) })}
            </p>
            <div className="h-2 rounded-full bg-track overflow-hidden mt-3">
              <div className="h-full rounded-full bg-data-good" style={{ width: `${khatmPct}%` }} />
            </div>
            <p className="text-white/60 text-[11px] mt-2">
              {pos
                ? t('quranHabit.khatamAt', {
                    name: nameOf(pos.surah),
                    ref: `${formatLocaleNumber(pos.surah)}:${formatLocaleNumber(pos.ayah)}`,
                  })
                : t('quranHabit.beginYourJourney')}{' '}
              ·{' '}
              {t('quranHabit.completed', {
                count: formatLocaleNumber(summary?.profile.khatmCount ?? 0),
              })}
            </p>
          </Link>
        </div>

        {/* Top surahs moved to the Analytics tab (Istiak's decision): completion
            counts are an insight, not a homepage feature. */}

        {/* ── special surahs ── */}
        <section className={`${CARD} p-5`}>
          <h2 className={SECTION_TITLE}>
            <Star8Icon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
            {t('quranHabit.belovedSurahs')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            {SPECIAL_SURAHS.map((sp) => (
              <button
                key={sp.surah}
                className={ITEM}
                onClick={() => navigate(`/quran/read/${sp.surah}?mode=single`)}
              >
                <p className="text-white text-sm font-bold">
                  {surahDisplayName({ number: sp.surah, englishName: sp.name }, i18n.language)}{' '}
                  <span className="text-white/50 font-normal">
                    · {formatLocaleNumber(sp.surah)}
                  </span>
                </p>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {i18n.language === 'bn' && sp.noteBn ? sp.noteBn : sp.note}
                </p>
                {sp.ref && (
                  <a
                    className={REF_LINK}
                    href={sp.ref.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {translateReference(sp.ref.text, i18n.language)}
                  </a>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── ayah bundles ── */}
        <section className={`${CARD} p-5`}>
          <h2 className={SECTION_TITLE}>
            <ShieldCheckIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
            {t('quranHabit.protectionTitle')}
          </h2>
          <p className="text-white/60 text-xs mt-1">{t('quranHabit.protectionSubtitle')}</p>
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            {AYAH_BUNDLES.map((b) => (
              <button
                key={b.id}
                className={ITEM}
                onClick={() =>
                  navigate(`/quran/read/${b.surah}?start=${b.fromAyah}&end=${b.toAyah}&mode=bundle`)
                }
              >
                <p className="text-white text-sm font-bold">
                  {i18n.language === 'bn' && b.titleBn ? b.titleBn : b.title}{' '}
                  <span className="text-white/50 font-normal">
                    · {formatLocaleNumber(b.surah)}:{formatLocaleNumber(b.fromAyah)}
                    {b.toAyah !== b.fromAyah ? `–${formatLocaleNumber(b.toAyah)}` : ''}
                  </span>
                </p>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {i18n.language === 'bn' && b.virtueBn ? b.virtueBn : b.virtue}
                </p>
                <a
                  className={REF_LINK}
                  href={b.ref.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {translateReference(b.ref.text, i18n.language)}
                </a>
              </button>
            ))}
          </div>
        </section>

        {/* ── duas from the Quran: the prophets' own words, each with its story ── */}
        <section id="duas" className={`${CARD} p-5 scroll-mt-20`}>
          <h2 className={SECTION_TITLE}>
            <DuaHandsIcon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
            {t('quranHabit.duasTitle')}
          </h2>
          <p className="text-white/60 text-xs mt-1">{t('quranHabit.duasSubtitle')}</p>
          <div className="grid sm:grid-cols-2 gap-1.5 mt-3">
            {QURANIC_DUAS.map((d) => {
              const saved = savedDuas.includes(d.id);
              const open = () =>
                navigate(
                  `/quran/read/${d.surah}?start=${d.fromAyah}&end=${d.toAyah}&mode=bundle&dua=${d.id}`
                );
              return (
                <div
                  key={d.id}
                  className="group flex items-center gap-2.5 rounded-control border border-brand-border bg-brand-surface/50 hover:border-brand-gold/40 hover:bg-brand-surface px-3 py-2 transition-colors cursor-pointer"
                  onClick={open}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') open();
                  }}
                >
                  <DuaHandsIcon className="w-4 h-4 text-brand-gold shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-white/80 group-hover:text-white text-xs transition-colors">
                    {i18n.language === 'bn' && d.titleBn ? d.titleBn : d.title}
                  </span>
                  <span className="text-white/50 text-[10px] tabular-nums">
                    {formatLocaleNumber(d.surah)}:{formatLocaleNumber(d.fromAyah)}
                  </span>
                  <button
                    aria-label={
                      saved
                        ? t('quranHabit.removeDuaAriaLabel', { title: d.title })
                        : t('quranHabit.saveDuaAriaLabel', { title: d.title })
                    }
                    aria-pressed={saved}
                    className={`p-1.5 -m-1 rounded-lg hover:bg-shade/10 transition-colors ${saved ? 'text-brand-gold' : 'text-white/40 hover:text-brand-gold'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDua.mutate(d.id);
                    }}
                  >
                    {saved ? (
                      <BookmarkSolidIcon className="w-4 h-4" />
                    ) : (
                      <BookmarkIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Browse all surahs lives on the dedicated Read tab (no duplicate list here). */}
        <Link
          to="/quran/browse"
          className={`${CARD} flex items-center justify-center gap-2 p-4 text-white/80 text-sm font-bold hover:border-brand-emerald/40 hover:shadow-hover transition`}
        >
          <QueueListIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
          {t('quranHabit.browseAll')}
        </Link>

        {/* virtue footer: Tirmidhī 2910 (ṣaḥīḥ, al-Albānī) and Bukhārī 5027, checked on sunnah.com */}
        <p className="text-white/60 text-xs leading-relaxed px-1">
          {t('quranHabit.hadithReward')} (
          <a
            className="underline"
            href="https://sunnah.com/tirmidhi:2910"
            target="_blank"
            rel="noreferrer"
          >
            {translateReference('Tirmidhi 2910 (sahih)', i18n.language)}
          </a>
          ). {t('quranHabit.hadithBest')} (
          <a
            className="underline"
            href="https://sunnah.com/bukhari:5027"
            target="_blank"
            rel="noreferrer"
          >
            {translateReference('Bukhari 5027', i18n.language)}
          </a>
          ).
        </p>
      </div>
    </AnimatedBackground>
  );
}
