// Salat hero (audit T3.2, Bustan Arch): the screen's one arch. Day navigator,
// Gregorian + Hijri date, and one leaf per fard prayer as the completion mark
// (Done = sage, Kaza = gold, Miss = muted red outline, not logged = faint).
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LeafIcon, PrayerGlyph } from '../icons/IslamicIcons.js';
import { getHijriDate, formatHijriDate } from '../../utils/islamicCalendar.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import type { PrayerStatus } from '../../hooks/useSalatLog.js';
import { friendlyDate } from './salatParts.js';

export interface SalatHeroProps {
  selectedDate: string;
  isToday: boolean;
  isAtStartDate: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Display status per fard prayer, in order (past unlogged = 'missed'). */
  marks: { id: string; name: string; status: PrayerStatus }[];
  completedCount: number;
  /** Rayhanah days: salat is excused, so no marks or count. */
  excused: boolean;
}

const LEAF_CLASS: Record<PrayerStatus, string> = {
  completed: 'text-brand-emerald fill-current',
  kaza: 'text-brand-gold fill-current',
  missed: 'text-red-400/70',
  pending: 'text-white/25',
};

export default function SalatHero({
  selectedDate,
  isToday,
  isAtStartDate,
  onPrev,
  onNext,
  marks,
  completedCount,
  excused,
}: SalatHeroProps) {
  const { t } = useTranslation();
  const day = new Date(selectedDate + 'T12:00:00');
  const hijri = getHijriDate(day);
  const statusLabel = (s: PrayerStatus) =>
    s === 'completed'
      ? t('salatTracker.legendDone', 'Done')
      : s === 'kaza'
        ? t('salatTracker.legendKaza', 'Kaza')
        : s === 'missed'
          ? t('salatTracker.legendMissed', 'Miss')
          : t('salatTracker.notLogged', 'Not logged');
  const navBtn =
    'p-2 rounded-control border border-brand-border bg-brand-deep/60 text-white/60 hover:text-white hover:border-brand-emerald/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors';

  return (
    <section
      aria-label={t('salatTracker.datePrayers', "{{date}}'s Prayers", {
        date: friendlyDate(selectedDate, t),
      })}
      className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-4 pt-8 pb-5 text-center"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={isAtStartDate}
          title={
            isAtStartDate
              ? t('salatTracker.noLogsBefore', 'No logs before this date')
              : t('salatTracker.previousDay', 'Previous day')
          }
          aria-label={t('salatTracker.previousDay', 'Previous day')}
          className={navBtn}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold text-white leading-tight">
            {friendlyDate(selectedDate, t)}
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            {formatLocaleDate(day, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {hijri && <p className="text-brand-gold text-[11px] mt-0.5">{formatHijriDate(hijri)}</p>}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={isToday}
          aria-label={t('salatTracker.nextDay', 'Next day')}
          className={navBtn}
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {!excused && (
        <div className="mt-4 pt-4 border-t border-brand-border/70">
          <ul className="flex items-start justify-center gap-3 sm:gap-5">
            {marks.map((m) => {
              const name = translateSalatName(m.id, m.name, t);
              return (
                <li key={m.id} className="flex flex-col items-center gap-1 w-12">
                  <PrayerGlyph id={m.id} className="w-4 h-4 text-white/50" />
                  <LeafIcon className={`w-6 h-6 ${LEAF_CLASS[m.status]}`} />
                  <span className="text-[10px] text-white/60 leading-none truncate max-w-full">
                    {name}
                    <span className="sr-only">: {statusLabel(m.status)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-white/60">
            {completedCount === 5 ? (
              <span className="text-brand-emerald font-semibold">
                {t('salatTracker.allCompleted', 'All five prayers done, MashaAllah!')}
              </span>
            ) : (
              t('salatTracker.prayedOfFive', '{{done}} of {{total}} prayed', {
                done: formatLocaleNumber(completedCount),
                total: formatLocaleNumber(5),
              })
            )}
          </p>
        </div>
      )}
    </section>
  );
}
