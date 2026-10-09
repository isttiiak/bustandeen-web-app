import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { MaghribIcon, SunriseIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { useUpdatePrayer, type PrayerId, type SalatLog } from '../../hooks/useSalatLog.js';
import {
  formatTime,
  getPrayerEndTime,
  translateSalatName,
  PRAYER_META,
  type PrayerTimesResult,
} from '../../utils/prayerTimes.js';
import { getDayStartMode, getTrackingDay } from '../../utils/trackingDay.js';
import { celebrateAllPrayers, celebrateSmall } from '../../utils/celebrate.js';
import { translateReference } from '../../utils/localeReference.js';
import {
  ADHKAR_REF,
  TIMELINE_PRAYERS,
  buildTimeline,
  canMarkFromHome,
  type TimelineRow,
} from '../../utils/todayTimeline.js';

/**
 * Home's "Today" timeline (T3.4): the five prayers with their time and
 * status, the current one with a single "Mark Done", and the morning/evening
 * adhkār inside their windows. Everything else about a prayer (Kaza, Miss,
 * qaṣr, jamʿ, past days) stays on the Salat page.
 */
export default function TodayTimeline({
  times,
  now,
  log,
  excused,
  travelling,
}: {
  times: PrayerTimesResult;
  now: Date;
  log: SalatLog | undefined;
  excused: boolean;
  travelling: boolean;
}) {
  const { t, i18n } = useTranslation();
  const updatePrayer = useUpdatePrayer();
  const statuses = Object.fromEntries(
    TIMELINE_PRAYERS.map((id) => [id, log?.prayers[id]?.status])
  ) as Record<PrayerId, string | undefined>;
  const rows = buildTimeline(times, now, statuses);
  const name = (id: string) =>
    translateSalatName(id, PRAYER_META.find((p) => p.id === id)?.name ?? '', t);

  const markDone = (row: TimelineRow) => {
    const current = log?.prayers[row.id];
    updatePrayer.mutate({
      prayer: row.id,
      status: 'completed',
      date: getTrackingDay(now),
      location: current?.location ?? 'home',
      tasbeeh: current?.tasbeeh ?? false,
      ayatulKursi: current?.ayatulKursi ?? false,
      windowStart: row.time.toISOString(),
      windowEnd: getPrayerEndTime(row.id, times).toISOString(),
    });
    const doneAfter = rows.filter(
      (r) => r.id === row.id || r.status === 'completed' || r.status === 'kaza'
    ).length;
    if (doneAfter >= 5) celebrateAllPrayers();
    else celebrateSmall();
  };

  const statusTag = (row: TimelineRow) => {
    if (excused && row.status === 'pending') return t('home.excused');
    if (row.status === 'completed') return t('home.timelineDone', 'Done');
    if (row.status === 'kaza') return t('home.timelineKaza', 'Kaza');
    if (row.status === 'missed') return t('home.timelineMiss', 'Miss');
    return null;
  };

  return (
    <section aria-labelledby="today-timeline-title" className="mb-4" data-testid="today-timeline">
      <h2 id="today-timeline-title" className="sr-only">
        {t('home.timelineTitle', "Today's prayers")}
      </h2>
      <ol className="relative pl-7 before:absolute before:left-[9px] before:top-3 before:bottom-3 before:w-0.5 before:bg-brand-border">
        {rows.map((row) => {
          const tag = statusTag(row);
          const done = row.status === 'completed' || row.status === 'kaza';
          const canMark =
            row.current &&
            canMarkFromHome({
              status: row.status,
              times,
              now,
              dayStartMode: getDayStartMode(),
              excused,
              travelling,
            });
          return (
            <li key={row.id} className="relative mb-3 last:mb-0" data-prayer={row.id}>
              <span
                aria-hidden="true"
                className={`absolute -left-7 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  done
                    ? 'bg-brand-emerald-dim border-brand-emerald-dim'
                    : row.current
                      ? 'bg-brand-void border-brand-emerald ring-4 ring-brand-emerald/15'
                      : 'bg-brand-void border-brand-border'
                }`}
              >
                {done && <CheckIcon className="w-3 h-3 text-on-color" />}
              </span>
              <div
                className={`rounded-card border bg-brand-deep px-4 ${
                  row.current
                    ? 'border-brand-emerald/50 shadow-elev-2 py-3.5'
                    : 'border-brand-border/70 shadow-elev-1 py-2.5'
                }`}
                aria-current={row.current ? 'time' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-white font-semibold text-base">
                    {name(row.id)}
                    {row.current && (
                      <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-brand-gold align-middle">
                        {t('home.timelineNow', 'Now')}
                      </span>
                    )}
                  </h3>
                  <span className="flex items-center gap-2 shrink-0">
                    {tag && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          row.status === 'kaza'
                            ? 'text-brand-gold border-brand-gold/50'
                            : row.status === 'missed'
                              ? 'text-red-300 border-red-300/50'
                              : 'text-brand-emerald border-brand-emerald/50'
                        }`}
                      >
                        {tag}
                      </span>
                    )}
                    <span className="text-white/70 text-xs font-semibold tabular-nums">
                      {formatTime(row.time)}
                    </span>
                  </span>
                </div>

                {row.current && (
                  <div className="flex gap-2 mt-3">
                    {canMark && (
                      <button
                        onClick={() => markDone(row)}
                        className={`${BTN_PRIMARY} flex-1 min-h-[44px]`}
                      >
                        {t('home.timelineMarkDone', 'Mark Done')}
                      </button>
                    )}
                    <Link to="/salat" className={`${BTN_SECONDARY} flex-1 min-h-[44px]`}>
                      {t('home.timelineOpenSalat', 'Open Salat')}
                    </Link>
                  </div>
                )}

                {row.adhkar && (
                  <Link
                    to={`/library/adhkar?period=${row.adhkar.period}`}
                    className={`mt-2.5 flex items-center gap-2.5 rounded-control border px-3 py-2.5 transition-colors ${
                      row.adhkar.open
                        ? 'border-brand-gold/50 bg-brand-gold/10 hover:bg-brand-gold/15'
                        : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40'
                    }`}
                  >
                    {row.adhkar.period === 'morning' ? (
                      <SunriseIcon
                        className="w-5 h-5 shrink-0 text-brand-gold"
                        aria-hidden="true"
                      />
                    ) : (
                      <MaghribIcon
                        className="w-5 h-5 shrink-0 text-brand-gold"
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex-1 min-w-0 text-xs leading-snug">
                      <span className="block text-white font-bold">
                        {row.adhkar.period === 'morning'
                          ? t('home.adhkarMorning', 'Morning adhkār')
                          : t('home.adhkarEvening', 'Evening adhkār')}
                      </span>
                      <span className="block text-white/70">
                        {row.adhkar.open
                          ? t('home.adhkarOpenUntil', 'Now, until {{time}}', {
                              time: formatTime(row.adhkar.until),
                            })
                          : row.adhkar.period === 'morning'
                            ? t('home.adhkarMorningWhen', 'From Fajr until sunrise')
                            : t('home.adhkarEveningWhen', 'From ʿAṣr until Maghrib')}
                        {' · '}
                        {translateReference(ADHKAR_REF, i18n.language)}
                      </span>
                    </span>
                    <ChevronRightIcon
                      className="w-4 h-4 shrink-0 text-white/60"
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
