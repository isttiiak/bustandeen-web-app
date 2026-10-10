import { useMemo, type ComponentType, type SVGProps } from 'react';
import IntentionLine from '../components/analytics/IntentionLine.js';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { Link } from 'react-router';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { CARD, SECTION_TITLE } from '../components/bustanStyles.js';
import {
  BoltIcon,
  CalendarDaysIcon,
  MinusCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  CrescentIcon,
  FlowerIcon,
  MosqueIcon,
  Star8Icon,
} from '../components/icons/IslamicIcons.js';
import TabNav from '../components/TabNav.js';
import DaifExplainer from '../components/DaifExplainer.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useFastingHistory } from '../hooks/useFasting.js';
import { useCycleSummary } from '../hooks/useCycle.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import { getTrackingDay } from '../utils/trackingDay.js';

/**
 * Ramadan analytics — how the month actually went, not a scoreboard.
 *
 * Everything is DERIVED from the FastingLog rows the tracker already writes
 * (category 'ramadan'), plus the Rayhanah cycle intervals for excused days.
 * No new endpoint, no new collection — the same rule the fasting summary
 * follows: counts are computed, never double-booked.
 *
 * Charts are hand-rolled SVG for the same reason TrendChart is: a charting
 * library is not worth half a megabyte on a page like this.
 */

// Ashra tones are theme tokens so both themes keep contrast (T3.2).
const ASHRA = [
  {
    from: 1,
    to: 10,
    labelKey: 'ramadan.ashraRahmah',
    text: 'text-brand-emerald',
    bar: 'bg-brand-emerald',
  },
  {
    from: 11,
    to: 20,
    labelKey: 'ramadan.ashraMaghfirah',
    text: 'text-brand-info',
    bar: 'bg-brand-info',
  },
  { from: 21, to: 30, labelKey: 'ramadan.ashraItq', text: 'text-brand-gold', bar: 'bg-brand-gold' },
];

function Stat({
  label,
  value,
  suffix,
  hint,
  tone,
  Icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  tone: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${tone}`} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <p className={`font-bold text-2xl leading-tight mt-1 tabular-nums ${tone}`}>
        {value}
        {suffix && <span className="text-white/60 text-sm font-bold">{suffix}</span>}
      </p>
      {hint && <p className="text-white/65 text-[11px] mt-0.5">{hint}</p>}
    </div>
  );
}
export default function RamadanAnalytics() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const today = getTrackingDay();
  const window_ = useMemo(() => getRamadanWindow(), []);
  const { data: history } = useFastingHistory(400, true);
  const { data: cycleSummary } = useCycleSummary();

  const model = useMemo(() => {
    const byDate = new Map<string, { status: string; tarawih?: boolean }>();
    for (const l of history ?? []) {
      if (l.category === 'ramadan') {
        byDate.set(l.date, { status: l.status, tarawih: (l as { tarawih?: boolean }).tarawih });
      }
    }

    const isExcused = (day: string): boolean => {
      for (const l of cycleSummary?.logs ?? []) {
        const end = l.endDate ?? (cycleSummary?.active ? today : l.startDate);
        if (l.startDate <= day && day <= end) return true;
      }
      return false;
    };

    const days = window_.days.map((d) => {
      const log = byDate.get(d.date);
      const excused = isExcused(d.date) && d.date <= today;
      return {
        ...d,
        elapsed: d.date <= today,
        fasted: log?.status === 'completed',
        broken: log?.status === 'broken',
        tarawih: !!log?.tarawih,
        excused,
        // A day that has passed with nothing logged and no excuse.
        unlogged: d.date < today && !log && !excused,
      };
    });

    const elapsed = days.filter((d) => d.elapsed);
    const fasted = days.filter((d) => d.fasted).length;
    const broken = days.filter((d) => d.broken).length;
    const excused = days.filter((d) => d.excused).length;
    const unlogged = days.filter((d) => d.unlogged).length;
    const tarawih = days.filter((d) => d.tarawih).length;

    // Longest run of consecutive fasted days.
    let best = 0,
      run = 0;
    for (const d of days) {
      if (d.fasted) {
        run += 1;
        best = Math.max(best, run);
      } else if (d.elapsed) {
        run = 0;
      }
    }

    // Obligated = elapsed days that were not excused. Excused days are NOT a
    // failure and must never drag the rate down — they move to qada instead.
    const obligated = elapsed.length - excused;
    const rate = obligated > 0 ? Math.round((fasted / obligated) * 100) : 0;

    const lastTen = days.filter((d) => d.isLastTen);
    const oddNights = lastTen.filter((d) => d.isOdd);

    return {
      days,
      elapsed: elapsed.length,
      fasted,
      broken,
      excused,
      unlogged,
      tarawih,
      best,
      rate,
      obligated,
      byAshra: ASHRA.map((a) => {
        const group = days.filter((d) => d.dayNumber >= a.from && d.dayNumber <= a.to);
        const groupElapsed = group.filter((d) => d.elapsed && !d.excused).length;
        return {
          ...a,
          label: t(a.labelKey),
          total: group.length,
          fasted: group.filter((d) => d.fasted).length,
          tarawih: group.filter((d) => d.tarawih).length,
          elapsed: groupElapsed,
        };
      }),
      lastTenTarawih: lastTen.filter((d) => d.tarawih).length,
      lastTenTotal: lastTen.length,
      oddNightsTarawih: oddNights.filter((d) => d.tarawih).length,
      oddNightsTotal: oddNights.length,
    };
  }, [history, cycleSummary, window_, today, t]);

  if (!user) return null;

  const noData = model.elapsed === 0;
  const year =
    window_.hijriYear != null ? formatLocaleNumber(window_.hijriYear, { useGrouping: false }) : '';
  const tabs = (
    <TabNav
      items={[
        { label: t('ramadanAnalytics.tabTracker'), to: '/ramadan' },
        { label: t('ramadanAnalytics.tabAnalytics'), to: '/ramadan/analytics', active: true },
      ]}
    />
  );

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('ramadanAnalytics.title')}</h1>
      <div className="px-4 pt-3 pb-0 max-w-2xl mx-auto">
        {tabs}
        <div className="pt-3">
          <IntentionLine />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 space-y-5">
        {noData ? (
          <section className={`${CARD} p-8 text-center`}>
            <span className="mx-auto w-16 h-16 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/40 text-brand-gold">
              <CrescentIcon className="w-8 h-8" aria-hidden="true" />
            </span>
            <h2 className="font-display text-white font-bold text-lg mt-3">
              {t('ramadanAnalytics.nothingYet')}
            </h2>
            <p className="text-white/75 text-sm mt-1.5 leading-relaxed">
              {t('ramadanAnalytics.nothingYetDesc', { year })}
            </p>
            <Link
              to="/ramadan"
              className="inline-block mt-4 text-brand-gold font-semibold text-sm underline underline-offset-2"
            >
              {t('ramadanAnalytics.goToTracker')}
            </Link>
          </section>
        ) : (
          <>
            {/* The screen's one arch: how the month went */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-5 text-center"
            >
              <p className="text-brand-gold text-xs font-bold uppercase tracking-widest">
                {t('ramadanAnalytics.ramadanYear', { year })}
              </p>
              <h2 className="font-display text-5xl font-bold text-white leading-none mt-2 tabular-nums">
                {formatLocaleNumber(model.fasted)}
              </h2>
              <p className="text-white/80 text-sm font-semibold mt-1">
                {t('ramadanAnalytics.ofRequiredDays', {
                  total: formatLocaleNumber(model.obligated),
                })}
              </p>
              <div
                className="mt-4 h-2.5 rounded-full bg-shade/30 overflow-hidden"
                role="progressbar"
                aria-valuenow={model.rate}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <motion.div
                  className="h-full rounded-full bg-brand-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${model.rate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-white/75 text-xs mt-1.5">
                {formatLocaleNumber(model.rate)}% {t('ramadanAnalytics.rateDescription')}
                {model.excused > 0 && (
                  <>
                    {' '}
                    · {formatLocaleNumber(model.excused)} {t('ramadanAnalytics.excusedNote')}
                  </>
                )}
              </p>
            </motion.section>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat
                Icon={BoltIcon}
                label={t('ramadanAnalytics.longestRun')}
                value={formatLocaleNumber(model.best)}
                suffix={` ${t('common.days')}`}
                tone="text-brand-gold"
                hint={t('ramadanAnalytics.backToBack')}
              />
              <Stat
                Icon={MosqueIcon}
                label={t('ramadanAnalytics.tarawihNights')}
                value={formatLocaleNumber(model.tarawih)}
                suffix={`/${formatLocaleNumber(model.elapsed)}`}
                tone="text-brand-info"
                hint={t('ramadanAnalytics.soFar')}
              />
              <Stat
                Icon={XCircleIcon}
                label={t('ramadanAnalytics.broken')}
                value={formatLocaleNumber(model.broken)}
                tone="text-red-400"
                hint={
                  model.broken
                    ? t('ramadanAnalytics.makeTheseUp')
                    : t('ramadanAnalytics.noneAlhamdulillah')
                }
              />
              <Stat
                Icon={MinusCircleIcon}
                label={t('ramadanAnalytics.notLogged')}
                value={formatLocaleNumber(model.unlogged)}
                tone="text-white/80"
                hint={
                  model.unlogged
                    ? t('ramadanAnalytics.pastDaysNoEntry', {
                        count: formatLocaleNumber(model.unlogged),
                      })
                    : t('ramadanAnalytics.allDaysAccounted', {
                        total: formatLocaleNumber(model.elapsed),
                      })
                }
              />
            </div>

            {/* Per-ashra breakdown */}
            <section className={`${CARD} p-5`}>
              <h2 className={SECTION_TITLE}>
                <CalendarDaysIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
                {t('ramadanAnalytics.byAshra')}
              </h2>
              <p className="text-white/65 text-[11px] mt-1 mb-4">
                {t('ramadanAnalytics.ashraSubtitle')}
              </p>
              <div className="space-y-4">
                {model.byAshra.map((a) => {
                  const pct = a.elapsed > 0 ? Math.round((a.fasted / a.elapsed) * 100) : 0;
                  return (
                    <div key={a.from}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className={`font-bold text-sm ${a.text}`}>{a.label}</span>
                        <span className="text-white/70 text-[11px] tabular-nums">
                          {a.fasted}/{a.elapsed || a.total} {t('ramadanAnalytics.fasted')} ·{' '}
                          {a.tarawih} {t('ramadanAnalytics.tarawih')}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-shade/30 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${a.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Last ten focus */}
            <section className={`${CARD} border-brand-info/40 p-5`}>
              <h2 className={SECTION_TITLE}>
                <Star8Icon className="w-5 h-5 text-brand-info" aria-hidden="true" />
                {t('ramadanAnalytics.lastTenTitle')}
              </h2>
              <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
                {t('ramadanAnalytics.lastTenHadith')}{' '}
                <a
                  className="underline text-brand-gold"
                  href="https://sunnah.com/bukhari:2017"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Ṣaḥīḥ al-Bukhārī 2017', i18n.language)}
                </a>
                .{t('ramadanAnalytics.lastTenNote')}
              </p>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {(
                  [
                    [
                      t('ramadanAnalytics.tarawihLastTen'),
                      model.lastTenTarawih,
                      model.lastTenTotal,
                    ],
                    [
                      t('ramadanAnalytics.oddNightsKept'),
                      model.oddNightsTarawih,
                      model.oddNightsTotal,
                    ],
                  ] as const
                ).map(([label, n, total]) => (
                  <div
                    key={label}
                    className="rounded-control bg-shade/20 border border-brand-border p-3"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                      {label}
                    </p>
                    <p className="text-brand-info font-bold text-xl mt-0.5 tabular-nums">
                      {n}
                      <span className="text-white/60 text-sm">/{total}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Day strip */}
            <section className={`${CARD} p-5`}>
              <h2 className={`${SECTION_TITLE} mb-3`}>
                <CrescentIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
                {t('ramadanAnalytics.everyDay')}
              </h2>
              <div className="grid grid-cols-10 gap-1">
                {model.days.map((d) => {
                  let cls = 'bg-shade/20 border-transparent';
                  if (d.excused) cls = 'bg-brand-pink/50 border-brand-pink/60';
                  else if (d.fasted) cls = 'bg-data-good border-data-good';
                  else if (d.broken) cls = 'bg-red-400/70 border-red-400';
                  else if (d.unlogged) cls = 'bg-transparent border-white/55 border-dashed';
                  return (
                    <div
                      key={d.date}
                      title={`${t('ramadanAnalytics.ramadanDayTitle', { day: d.dayNumber })}${d.fasted ? ` · ${t('ramadanAnalytics.fasted')}` : d.broken ? ` · ${t('ramadanAnalytics.broken')}` : d.excused ? ` · ${t('ramadanAnalytics.excused')}` : d.unlogged ? ` · ${t('ramadanAnalytics.notLoggedShort')}` : ''}${d.tarawih ? ` · ${t('ramadanAnalytics.tarawih')}` : ''}`}
                      className={`relative aspect-square rounded border ${cls}`}
                    >
                      {d.tarawih && (
                        <MosqueIcon
                          className="absolute inset-0 m-auto w-3 h-3 text-on-color"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-[11px] text-white/75">
                {(
                  [
                    ['bg-data-good border-data-good', t('ramadanAnalytics.fasted')],
                    ['bg-red-400/70 border-red-400', t('ramadanAnalytics.broken')],
                    ['bg-brand-pink/50 border-brand-pink/60', t('ramadanAnalytics.excused')],
                    [
                      'bg-transparent border-white/55 border-dashed',
                      t('ramadanAnalytics.notLoggedShort'),
                    ],
                  ] as const
                ).map(([sw, label]) => (
                  <span key={label} className="inline-flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-sm border ${sw}`} aria-hidden="true" />
                    {label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1">
                  <MosqueIcon className="w-3.5 h-3.5 text-brand-info" aria-hidden="true" />
                  {t('ramadanAnalytics.tarawih')}
                </span>
              </div>
            </section>

            <p className="text-white/65 text-[11px] leading-relaxed">
              <FlowerIcon
                className="inline w-3.5 h-3.5 mr-1 text-brand-pink align-[-2px]"
                aria-hidden="true"
              />
              {t('ramadanAnalytics.excusedFootnote')} (
              <a
                className="underline text-brand-gold"
                href="https://sunnah.com/muslim:335"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Muslim 335', i18n.language)}
              </a>
              ). {t('ramadanAnalytics.somethingWrong')}{' '}
              <Link to="/feedback" className="text-brand-emerald underline underline-offset-2">
                {t('ramadanAnalytics.tellUs')}
              </Link>
              .
            </p>
          </>
        )}

        <DaifExplainer topics={['ramadan-ashra', 'nafl-fard-reward']} />
      </div>
    </AnimatedBackground>
  );
}
