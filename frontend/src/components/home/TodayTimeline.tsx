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
  ADHKAR_REFS,
  TIMELINE_PRAYERS,
  buildTimeline,
  canKazaFromHome,
  canMarkFromHome,
  type AdhkarPeriod,
  type TimelineRow,
} from '../../utils/todayTimeline.js';

const KAZA_BTN =
  "relative text-[11px] font-bold px-2 py-0.5 rounded-full border border-brand-gold/60 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 motion-safe:animate-soft-glow before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']";

/**
 * Home's "Today" timeline (T3.4): one compact card per prayer (name, status,
 * time). The current prayer has "Mark Done" and "Open Salat"; a prayer whose
 * time is over and is still unmarked or Miss gets a one-tap "Kaza" (never
 * ʿIshāʾ). The morning/evening adhkār card appears only while its window is
 * open. Miss, qaṣr, jamʿ and past days stay on the Salat page.
 */
export default function TodayTimeline({
  times,
  now,
  log,
  excused,
  travelling,
  showAdhkar = true,
}: {
  times: PrayerTimesResult;
  now: Date;
  log: SalatLog | undefined;
  excused: boolean;
  travelling: boolean;
  /** Settings → Home: the adhkār cards can be turned off. */
  showAdhkar?: boolean;
}) {
  const { t } = useTranslation();
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

  // Same write as the Salat page's Kaza tag, on the tracking day shown. Kaza
  // debt only follows explicit Miss marks, so a pending prayer adds nothing
  // and a Miss pays its one unit back (salat.service.ts, updatePrayerStatus).
  // No window bounds: a kaza is not a punctuality data point.
  const markKaza = (row: TimelineRow) => {
    const current = log?.prayers[row.id];
    updatePrayer.mutate({
      prayer: row.id,
      status: 'kaza',
      date: getTrackingDay(now),
      location: current?.location ?? 'home',
      tasbeeh: current?.tasbeeh ?? false,
      ayatulKursi: current?.ayatulKursi ?? false,
    });
    celebrateSmall();
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
          const rules = {
            status: row.status,
            times,
            now,
            dayStartMode: getDayStartMode(),
            excused,
            travelling,
          };
          const canMark = row.current && canMarkFromHome(rules);
          const canKaza = canKazaFromHome({ ...rules, prayer: row.id });
          const adhkar = showAdhkar ? row.adhkar : undefined;
          return (
            <li key={row.id} className="relative mb-2.5 last:mb-0" data-prayer={row.id}>
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
                className={`rounded-card border bg-brand-deep px-4 py-2.5 ${
                  row.current
                    ? 'border-brand-emerald/50 shadow-elev-2'
                    : 'border-brand-border/70 shadow-elev-1'
                }`}
                aria-current={row.current ? 'time' : undefined}
              >
                <div className="flex items-center justify-between gap-2 min-h-[28px]">
                  <h3 className="font-display text-white font-semibold text-base">
                    {name(row.id)}
                    {row.current && (
                      <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-brand-gold align-middle">
                        {t('home.timelineNow', 'Now')}
                      </span>
                    )}
                  </h3>
                  <span className="flex items-center gap-2 shrink-0">
                    {tag && !canKaza && (
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
                    {canKaza && (
                      // Tag-sized on screen; the ::before pad makes a 44px target.
                      <button
                        type="button"
                        onClick={() => markKaza(row)}
                        aria-label={t('home.timelineKazaAria', 'Mark {{prayer}} as Kaza', {
                          prayer: name(row.id),
                        })}
                        className={KAZA_BTN}
                      >
                        {t('home.timelineKaza', 'Kaza')}
                      </button>
                    )}
                    <span className="text-white/70 text-xs font-semibold tabular-nums">
                      {formatTime(row.time)}
                    </span>
                  </span>
                </div>

                {row.current && (
                  <div className="flex gap-2 mt-2">
                    {canMark && (
                      <button
                        onClick={() => markDone(row)}
                        className={`${BTN_PRIMARY} flex-1 min-h-[44px] py-2`}
                      >
                        {t('home.timelineMarkDone', 'Mark Done')}
                      </button>
                    )}
                    <Link to="/salat" className={`${BTN_SECONDARY} flex-1 min-h-[44px] py-2`}>
                      {t('home.timelineOpenSalat', 'Open Salat')}
                    </Link>
                  </div>
                )}

                {adhkar && <AdhkarCard period={adhkar.period} until={adhkar.until} />}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The open morning/evening adhkār, linking to that list in the Library.
 *  Shown only while its window is open (utils/todayTimeline.ts). */
export function AdhkarCard({ period, until }: { period: AdhkarPeriod; until: Date }) {
  const { t, i18n } = useTranslation();
  const Icon = period === 'morning' ? SunriseIcon : MaghribIcon;
  return (
    <Link
      to={`/library/adhkar?period=${period}`}
      className="mt-2 flex items-center gap-2.5 rounded-control border border-brand-gold/50 bg-brand-gold/10 hover:bg-brand-gold/15 px-3 py-2 transition-colors"
    >
      <Icon className="w-5 h-5 shrink-0 text-brand-gold" aria-hidden="true" />
      <span className="flex-1 min-w-0 text-xs leading-snug">
        <span className="block text-white font-bold">
          {period === 'morning'
            ? t('home.adhkarMorning', 'Morning adhkār')
            : t('home.adhkarEvening', 'Evening adhkār')}
        </span>
        <span className="block text-white/70">
          {t('home.adhkarOpenUntil', 'Now, until {{time}}', { time: formatTime(until) })}
          {' · '}
          {translateReference(ADHKAR_REFS[period], i18n.language)}
        </span>
      </span>
      <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/60" aria-hidden="true" />
    </Link>
  );
}
