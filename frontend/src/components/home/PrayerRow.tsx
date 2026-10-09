import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SalatLog } from '../../hooks/useSalatLog.js';
import { TIMELINE_PRAYERS, type TimelinePrayer } from '../../utils/todayTimeline.js';

type RowStatus = 'completed' | 'kaza' | 'missed' | 'pending';

const DOT: Record<RowStatus, string> = {
  completed: 'bg-brand-emerald-dim border-brand-emerald-dim',
  kaza: 'bg-brand-gold border-brand-gold',
  missed: 'bg-red-400/10 border-red-300',
  pending: 'bg-brand-deep border-brand-border',
};

const normalise = (s: string | undefined): RowStatus =>
  s === 'completed' || s === 'kaza' || s === 'missed' ? s : 'pending';

/**
 * The arch's five-prayer row (always on Home): the day's prayers as steps,
 * joined by a line that fills in as each one is prayed. Done is sage, Kaza
 * gold, Miss red, the current prayer ringed. Tapping it opens the Salat page.
 */
export default function PrayerRow({
  log,
  current,
  excused,
  name,
}: {
  log: SalatLog;
  current: string | null;
  excused: boolean;
  name: (id: string) => string;
}) {
  const { t } = useTranslation();
  const statuses = TIMELINE_PRAYERS.map((id) => normalise(log.prayers[id]?.status));
  const prayed = (s: RowStatus) => s === 'completed' || s === 'kaza';
  const label = (id: TimelinePrayer, s: RowStatus) =>
    s === 'completed'
      ? t('home.timelineDone', 'Done')
      : s === 'kaza'
        ? t('home.timelineKaza', 'Kaza')
        : s === 'missed'
          ? t('home.timelineMiss', 'Miss')
          : excused
            ? t('home.excused')
            : id === current
              ? t('home.timelineNow', 'Now')
              : '';

  return (
    <Link
      to="/salat"
      data-testid="arch-prayer-row"
      aria-label={t('home.archRowOpen', "Today's prayers, open Salat")}
      className="relative z-10 block mt-3 mx-auto w-fit rounded-control px-1 py-1 hover:bg-white/5 active:scale-[0.98] transition"
    >
      <ol className="flex items-start justify-center">
        {TIMELINE_PRAYERS.map((id, i) => {
          const st = statuses[i]!;
          const isCurrent = id === current && !prayed(st);
          const joined = i > 0 && prayed(statuses[i - 1]!) && prayed(st);
          return (
            <li key={id} className="flex items-start">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`mt-[11px] h-0.5 w-4 sm:w-6 rounded-full ${
                    joined ? 'bg-brand-emerald' : 'bg-brand-border'
                  }`}
                />
              )}
              <span className="flex flex-col items-center gap-1 w-11">
                <span
                  className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center ${DOT[st]} ${
                    isCurrent ? 'border-brand-emerald ring-2 ring-brand-emerald/25' : ''
                  }`}
                >
                  {prayed(st) && <CheckIcon className="w-3.5 h-3.5 text-on-color" />}
                  {st === 'missed' && <XMarkIcon className="w-3 h-3 text-red-300" />}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    st === 'kaza'
                      ? 'text-brand-gold'
                      : st === 'missed'
                        ? 'text-red-300'
                        : isCurrent
                          ? 'text-brand-emerald'
                          : 'text-white/70'
                  }`}
                >
                  {name(id)}
                  <span className="sr-only"> {label(id, st)}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </Link>
  );
}
