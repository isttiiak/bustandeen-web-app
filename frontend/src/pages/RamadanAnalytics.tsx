import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
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

const ASHRA = [
  { from: 1, to: 10, label: 'Raḥmah', tone: '#7a9e6e' },
  { from: 11, to: 20, label: 'Maghfirah', tone: '#5a9e8e' },
  { from: 21, to: 30, label: 'ʿItq min an-Nār', tone: '#c9a96e' },
];

function Stat({
  label,
  value,
  suffix,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p>
      <p className="font-black text-2xl leading-tight mt-1" style={{ color: tone }}>
        {value}
        {suffix && <span className="text-white/25 text-sm font-bold">{suffix}</span>}
      </p>
      {hint && <p className="text-white/30 text-[11px] mt-0.5">{hint}</p>}
    </div>
  );
}

export default function RamadanAnalytics() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
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
  }, [history, cycleSummary, window_, today]);

  if (!user) return null;

  const noData = model.elapsed === 0;

  if (isDemoMode) {
    return (
      <DemoSignInGate
        emoji="🌙"
        title={t('demoGate.analyticsTitle', 'Your personal analytics await')}
        desc={t(
          'demoGate.ramadanDesc',
          'Your Ramadan log and analytics are saved to your account.'
        )}
        backTo="/ramadan"
        backLabel={t('demoGate.backToRamadan', 'Back to Ramadan')}
        tabs={
          <TabNav
            items={[
              { label: t('ramadanAnalytics.tabTracker'), to: '/ramadan' },
              { label: t('ramadanAnalytics.tabAnalytics'), to: '/ramadan/analytics', active: true },
            ]}
          />
        }
      />
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('ramadanAnalytics.title')}</h1>
      <div className="px-4 pt-3 pb-0 max-w-2xl mx-auto">
        <TabNav
          items={[
            { label: t('ramadanAnalytics.tabTracker'), to: '/ramadan' },
            { label: t('ramadanAnalytics.tabAnalytics'), to: '/ramadan/analytics', active: true },
          ]}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 space-y-5">
        {noData ? (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-8 text-center">
            <div className="text-5xl mb-3">🌙</div>
            <h2 className="text-white font-black">{t('ramadanAnalytics.nothingYet')}</h2>
            <p className="text-white/40 text-sm mt-1.5 leading-relaxed">
              {t('ramadanAnalytics.nothingYetDesc', { year: window_.hijriYear ?? '' })}
            </p>
            <Link
              to="/ramadan"
              className="inline-block mt-4 text-brand-gold/80 hover:text-brand-gold text-sm underline underline-offset-2"
            >
              {t('ramadanAnalytics.goToTracker')}
            </Link>
          </div>
        ) : (
          <>
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-6 border border-brand-gold/25 bg-gradient-to-br from-brand-gold/15 via-brand-gold/10 to-brand-info/10"
            >
              <p className="text-brand-gold/80 text-xs font-bold uppercase tracking-widest">
                {t('ramadanAnalytics.ramadanYear', { year: window_.hijriYear ?? '' })}
              </p>
              <div className="flex items-end gap-3 mt-1">
                <h2 className="text-5xl font-black text-white leading-none">{model.fasted}</h2>
                <p className="text-white/40 text-sm font-semibold pb-1">
                  {t('ramadanAnalytics.ofRequiredDays', { count: model.obligated })}
                </p>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-gold to-brand-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${model.rate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-white/40 text-xs mt-1.5">
                {t('ramadanAnalytics.rateDescription', { rate: model.rate })}
                {model.excused > 0 && (
                  <> · {t('ramadanAnalytics.excusedNote', { count: model.excused })}</>
                )}
              </p>
            </motion.div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat
                label={t('ramadanAnalytics.longestRun')}
                value={formatLocaleNumber(model.best)}
                suffix={` ${t('common.days')}`}
                tone="#fbbf24"
                hint={t('ramadanAnalytics.backToBack')}
              />
              <Stat
                label={t('ramadanAnalytics.tarawihNights')}
                value={formatLocaleNumber(model.tarawih)}
                suffix={`/${formatLocaleNumber(model.elapsed)}`}
                tone="#a5b4fc"
                hint={t('ramadanAnalytics.soFar')}
              />
              <Stat
                label={t('ramadanAnalytics.broken')}
                value={formatLocaleNumber(model.broken)}
                tone="#f87171"
                hint={
                  model.broken
                    ? t('ramadanAnalytics.makeTheseUp')
                    : t('ramadanAnalytics.noneAlhamdulillah')
                }
              />
              <Stat
                label={t('ramadanAnalytics.notLogged')}
                value={formatLocaleNumber(model.unlogged)}
                tone="#94a3b8"
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
            <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
              <h2 className="text-white font-black mb-1">{t('ramadanAnalytics.byAshra')}</h2>
              <p className="text-white/30 text-[11px] mb-4">
                {t('ramadanAnalytics.ashraSubtitle')}
              </p>
              <div className="space-y-4">
                {model.byAshra.map((a) => {
                  const pct = a.elapsed > 0 ? Math.round((a.fasted / a.elapsed) * 100) : 0;
                  return (
                    <div key={a.label}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className="font-bold text-sm" style={{ color: a.tone }}>
                          {a.label}
                        </span>
                        <span className="text-white/30 text-[11px] tabular-nums">
                          {a.fasted}/{a.elapsed || a.total} {t('ramadanAnalytics.fasted')} ·{' '}
                          {a.tarawih} {t('ramadanAnalytics.tarawih')}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: a.tone }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Last ten focus */}
            <div className="rounded-3xl p-5 border border-brand-info/25 bg-gradient-to-br from-brand-info/10 to-brand-info/5">
              <h2 className="text-white font-black">{t('ramadanAnalytics.lastTenTitle')}</h2>
              <p className="text-brand-info/60 text-xs mt-1 leading-relaxed">
                {t('ramadanAnalytics.lastTenHadith')}{' '}
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:2017"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Ṣaḥīḥ al-Bukhārī 2017', i18n.language)}
                </a>
                .{t('ramadanAnalytics.lastTenNote')}
              </p>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div className="rounded-2xl bg-black/25 border border-brand-info/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                    {t('ramadanAnalytics.tarawihLastTen')}
                  </p>
                  <p className="text-brand-info font-black text-xl mt-0.5">
                    {model.lastTenTarawih}
                    <span className="text-white/25 text-sm">/{model.lastTenTotal}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-black/25 border border-brand-info/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                    {t('ramadanAnalytics.oddNightsKept')}
                  </p>
                  <p className="text-brand-info font-black text-xl mt-0.5">
                    {model.oddNightsTarawih}
                    <span className="text-white/25 text-sm">/{model.oddNightsTotal}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Day strip */}
            <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
              <h2 className="text-white font-black mb-3">{t('ramadanAnalytics.everyDay')}</h2>
              <div className="grid grid-cols-10 gap-1">
                {model.days.map((d) => {
                  let cls = 'bg-white/[0.05]';
                  if (d.excused) cls = 'bg-brand-pink/40';
                  else if (d.fasted) cls = 'bg-brand-emerald/60';
                  else if (d.broken) cls = 'bg-red-500/50';
                  else if (d.unlogged) cls = 'bg-white/[0.10]';
                  return (
                    <div
                      key={d.date}
                      title={`${t('ramadanAnalytics.ramadanDayTitle', { day: d.dayNumber })}${d.fasted ? ` · ${t('ramadanAnalytics.fasted')}` : d.broken ? ` · ${t('ramadanAnalytics.broken')}` : d.excused ? ` · ${t('ramadanAnalytics.excused')}` : d.unlogged ? ` · ${t('ramadanAnalytics.notLoggedShort')}` : ''}${d.tarawih ? ` · ${t('ramadanAnalytics.tarawih')}` : ''}`}
                      className={`relative aspect-square rounded ${cls}`}
                    >
                      {d.tarawih && (
                        <span className="absolute inset-0 grid place-items-center text-[7px]">
                          🕌
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-white/30">
                <span>🟩 {t('ramadanAnalytics.fasted')}</span>
                <span>🟥 {t('ramadanAnalytics.broken')}</span>
                <span>🌸 {t('ramadanAnalytics.excused')}</span>
                <span>⬜ {t('ramadanAnalytics.notLoggedShort')}</span>
                <span>🕌 {t('ramadanAnalytics.tarawih')}</span>
              </div>
            </div>

            <p className="text-white/30 text-[11px] leading-relaxed">
              {t('ramadanAnalytics.excusedFootnote')} (
              <a
                className="underline hover:text-white/50"
                href="https://sunnah.com/muslim:335"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Muslim 335', i18n.language)}
              </a>
              ).
              {t('ramadanAnalytics.somethingWrong')}{' '}
              <Link
                to="/feedback"
                className="text-brand-emerald/70 hover:text-brand-emerald underline underline-offset-2"
              >
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
