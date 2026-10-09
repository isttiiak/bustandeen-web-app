import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SalatLog } from '../../hooks/useSalatLog.js';
import { TIMELINE_PRAYERS, type TimelinePrayer } from '../../utils/todayTimeline.js';

type RowStatus = 'completed' | 'kaza' | 'missed' | 'pending';

// Opaque fills: the track runs behind the circles, into each one.
const DOT: Record<RowStatus, string> = {
  completed: 'bg-brand-emerald-dim border-brand-emerald-dim',
  kaza: 'bg-brand-gold border-brand-gold',
  missed: 'bg-brand-deep border-red-300',
  pending: 'bg-brand-deep border-brand-border',
};

/** Column width and gap in px (w-11, gap-4): the track's geometry. */
const COL = 44;
const GAP = 16;

const normalise = (s: string | undefined): RowStatus =>
  s === 'completed' || s === 'kaza' || s === 'missed' ? s : 'pending';

/**
 * The arch's five-prayer row (always on Home): the day's prayers as steps on
 * one line that runs through the circles, like the timeline's vertical line,
 * and fills in sage between prayers already prayed. Done is sage, Kaza gold,
 * Miss red; the current prayer is ringed with a green name. Tapping it opens
 * the Salat page.
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
      <div className="relative">
        {/* The track, from the first circle's centre to the last one's */}
        <span
          aria-hidden="true"
          className="absolute top-[11px] h-0.5 rounded-full bg-brand-border"
          style={{ left: COL / 2, right: COL / 2 }}
        />
        {TIMELINE_PRAYERS.slice(1).map((id, k) =>
          prayed(statuses[k]!) && prayed(statuses[k + 1]!) ? (
            <span
              key={`seg-${id}`}
              aria-hidden="true"
              className="absolute top-[11px] h-0.5 rounded-full bg-brand-emerald"
              style={{ left: COL / 2 + k * (COL + GAP), width: COL + GAP }}
            />
          ) : null
        )}
        <ol className="relative flex items-start justify-center gap-4">
          {TIMELINE_PRAYERS.map((id, i) => {
            const st = statuses[i]!;
            const isCurrent = id === current && !prayed(st);
            return (
              <li key={id} className="relative flex flex-col items-center gap-1 w-11">
                <span
                  className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center ${
                    isCurrent
                      ? 'bg-brand-deep border-brand-emerald ring-2 ring-brand-emerald/25'
                      : DOT[st]
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
              </li>
            );
          })}
        </ol>
      </div>
    </Link>
  );
}
