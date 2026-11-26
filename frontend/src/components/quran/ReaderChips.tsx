import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ClockIcon, PauseCircleIcon } from '@heroicons/react/24/outline';
import { DuaHandsIcon } from '../icons/IslamicIcons.js';
import { juzOf, surahDisplayName } from '../../utils/quranData.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { QuranReaderState } from './useQuranReader.js';

function formatReadingTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Surah, juz, today's count against the goal, the khatam position and the reading timer. */
export function ReaderChips({ reader }: { reader: QuranReaderState }) {
  const { t, i18n } = useTranslation();
  const {
    surahNo,
    surahMeta,
    current,
    user,
    countsGoal,
    todayCount,
    summary,
    khatamPos,
    isDemoMode,
    readingSession,
  } = reader;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="px-2.5 py-1 rounded-full bg-brand-deep border border-brand-border text-white/70 font-bold">
        {formatLocaleNumber(surahNo)}.{' '}
        {surahMeta ? surahDisplayName(surahMeta, i18n.language) : '…'}{' '}
        <span className="text-white/60">
          · {surahMeta ? formatLocaleNumber(surahMeta.numberOfAyahs) : '–'}{' '}
          {t('quranReader.ayahWord', 'āyāt')}
        </span>
      </span>
      <span className="px-2.5 py-1 rounded-full bg-brand-deep border border-brand-border text-white/50">
        {t('quranReader.juz', 'Juz')}{' '}
        {current ? formatLocaleNumber(juzOf(surahNo, current.numberInSurah)) : '–'}
      </span>
      {!user ? null : countsGoal ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald font-bold">
          <BookOpenIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {t('quranReader.todayCount', '{{count}} āyāt today', { count: todayCount })}
          {summary
            ? ` / ${t('quranReader.goalCount', '{{count}} goal', { count: summary.profile.dailyGoalAyat })}`
            : ''}
        </span>
      ) : (
        <span className="px-2.5 py-1 rounded-full bg-brand-deep border border-brand-border text-white/60">
          <DuaHandsIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" aria-hidden="true" />
          {t('quranReader.reflectionNote', 'Reflection, not counted toward the goal')}
        </span>
      )}
      {khatamPos && (
        <span className="px-2.5 py-1 rounded-full bg-brand-deep border border-brand-border text-white/60">
          {t('quranReader.khatamAt', 'Khatam at {{surah}}:{{ayah}}', {
            surah: khatamPos.surah,
            ayah: khatamPos.ayah,
          })}
        </span>
      )}
      {!!user && !isDemoMode && (
        <span
          title={
            readingSession.isPaused
              ? t('quranReader.timerPaused', "Paused. The timer resumes when you're back")
              : t('quranReader.timerActive', 'Active reading time this visit')
          }
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-brand-border bg-brand-deep font-bold tabular-nums text-white/70"
        >
          {readingSession.isPaused ? (
            <PauseCircleIcon className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {formatReadingTime(readingSession.activeSec)}
        </span>
      )}
    </div>
  );
}
