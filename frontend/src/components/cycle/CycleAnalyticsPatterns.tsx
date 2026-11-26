import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ChartBarIcon, ChevronRightIcon, HeartIcon } from '@heroicons/react/24/outline';
import { CrescentIcon } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import type { useFastingSummary } from '../../hooks/useFasting.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { translateReference } from '../../utils/localeReference.js';
import { SYMPTOM_LABEL, type CycleStats } from '../../utils/cycleStats.js';
import { BAR_TRACK, NOTE, TILE_LABEL, fmt } from './cycleAnalyticsParts.js';

/** Cycle and period length history, the last eight of each. */
export function CycleLengthHistory({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  const maxGap = Math.max(1, ...stats.gaps.map((g) => g.days));
  const maxLen = Math.max(1, ...stats.lengths.map((l) => l.days));
  return (
    <>
      {stats.gaps.length > 0 && (
        <section className={`${CARD} p-5`}>
          <h2 className={`${SECTION_TITLE} mb-3`}>
            <ChartBarIcon className="w-5 h-5 text-brand-pink" />
            {t('cycleAnalytics.cycleLengthHistoryTitle', 'Cycle length history')}
          </h2>
          <div className="space-y-1.5">
            {stats.gaps.slice(-8).map((g) => (
              <div key={g.from} className="flex items-center gap-2 text-xs">
                <span className="text-white/70 w-14">{fmt(g.from)}</span>
                <div className={`${BAR_TRACK} h-4`}>
                  <div
                    className="h-full rounded-full bg-brand-pink/70"
                    style={{ width: `${(g.days / maxGap) * 100}%` }}
                  />
                </div>
                <span className="text-brand-pink font-bold w-8 text-right tabular-nums">
                  {formatLocaleNumber(g.days)}d
                </span>
              </div>
            ))}
          </div>
          {stats.lengths.length > 0 && (
            <>
              <h3 className="text-white/80 font-bold text-xs uppercase tracking-wide mt-4 mb-2">
                {t('cycleAnalytics.periodLengthTitle', 'Period length')}
              </h3>
              <div className="space-y-1.5">
                {stats.lengths.slice(-8).map((l) => (
                  <div key={l.from} className="flex items-center gap-2 text-xs">
                    <span className="text-white/70 w-14">{fmt(l.from)}</span>
                    <div className={`${BAR_TRACK} h-4`}>
                      <div
                        className="h-full rounded-full bg-brand-warm/70"
                        style={{ width: `${(l.days / maxLen) * 100}%` }}
                      />
                    </div>
                    <span className="text-brand-warm font-bold w-8 text-right tabular-nums">
                      {formatLocaleNumber(l.days)}d
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

/** Your body's patterns over the last 60 days: top symptoms and the flow mix. */
export function CycleBodyPatterns({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  return (
    <>
      {(stats.topSymptoms.length > 0 || stats.flowTotal > 0) && (
        <section className={`${CARD} p-5 space-y-4`}>
          <h2 className={SECTION_TITLE}>
            <HeartIcon className="w-5 h-5 text-brand-pink" />
            {t('cycleAnalytics.bodyPatternsTitle', "Your body's patterns")}{' '}
            <span className="text-white/70 text-[11px] font-normal font-body">
              {t('cycleAnalytics.last60Days', '(last 60 days)')}
            </span>
          </h2>
          {stats.topSymptoms.length > 0 && (
            <div className="space-y-1.5">
              {stats.topSymptoms.map(([sy, n]) => (
                <div key={sy} className="flex items-center gap-2 text-xs">
                  <span className="text-white/80 w-28">
                    {t(`cycleAnalytics.symptom.${sy}`, SYMPTOM_LABEL[sy] ?? sy)}
                  </span>
                  <div className={`${BAR_TRACK} h-3`}>
                    <div
                      className="h-full rounded-full bg-brand-pink/70"
                      style={{ width: `${Math.min(100, n * 12)}%` }}
                    />
                  </div>
                  <span className="text-white/70 w-14 text-right whitespace-nowrap">
                    {t('cycleAnalytics.nDays', '{{count, number}} day(s)', { count: n })}
                  </span>
                </div>
              ))}
            </div>
          )}
          {stats.flowTotal > 0 && (
            <div>
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide mb-1.5">
                {t('cycleAnalytics.flowMix', 'Flow mix')}
              </p>
              <div className="flex h-3 rounded-full overflow-hidden">
                {stats.flowLight > 0 && (
                  <div
                    className="bg-brand-pink/60"
                    style={{ width: `${(stats.flowLight / stats.flowTotal) * 100}%` }}
                  />
                )}
                {stats.flowMed > 0 && (
                  <div
                    className="bg-brand-pink/70"
                    style={{ width: `${(stats.flowMed / stats.flowTotal) * 100}%` }}
                  />
                )}
                {stats.flowHeavy > 0 && (
                  <div
                    className="bg-brand-pink-dim/80"
                    style={{ width: `${(stats.flowHeavy / stats.flowTotal) * 100}%` }}
                  />
                )}
              </div>
              <p className="text-white/70 text-[10px] mt-1">
                {t(
                  'cycleAnalytics.flowMixSummary',
                  '{{light, number}} light · {{medium, number}} medium · {{heavy, number}} heavy',
                  { light: stats.flowLight, medium: stats.flowMed, heavy: stats.flowHeavy }
                )}
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/** Fasting makeup: owed, made up, remaining. */
export function CycleFastingMakeup({
  stats,
  fastingSummary,
}: {
  stats: CycleStats;
  fastingSummary: ReturnType<typeof useFastingSummary>['data'];
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      {stats.totalExcusedDays > 0 && (
        <section className={`${CARD} p-5`}>
          <h2 className={SECTION_TITLE}>
            <CrescentIcon className="w-5 h-5 text-brand-gold" />
            {t('cycleAnalytics.fastingMakeupTitle', 'Fasting makeup')}
          </h2>
          <p className={NOTE}>
            {t(
              'cycleAnalytics.fastingMakeupDesc',
              'Ramadan fasts missed during cycles are made up later'
            )}{' '}
            (
            <a
              className="underline"
              href="https://sunnah.com/muslim:335"
              target="_blank"
              rel="noreferrer"
            >
              {translateReference('Muslim 335', i18n.language)}
            </a>
            ).
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
              <p className="font-display text-2xl font-bold text-brand-gold">
                {formatLocaleNumber(fastingSummary?.profile?.qadaOwed ?? 0)}
              </p>
              <p className={TILE_LABEL}>{t('cycleAnalytics.owed', 'owed')}</p>
            </div>
            <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
              <p className="font-display text-2xl font-bold text-brand-emerald">
                {formatLocaleNumber(fastingSummary?.qadaCompleted ?? 0)}
              </p>
              <p className={TILE_LABEL}>{t('cycleAnalytics.madeUp', 'made up')}</p>
            </div>
            <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
              <p className="font-display text-2xl font-bold text-white">
                {formatLocaleNumber(
                  Math.max(
                    0,
                    (fastingSummary?.profile?.qadaOwed ?? 0) - (fastingSummary?.qadaCompleted ?? 0)
                  )
                )}
              </p>
              <p className={TILE_LABEL}>{t('cycleAnalytics.remaining', 'remaining')}</p>
            </div>
          </div>
          <button
            className="mt-3 w-full inline-flex items-center justify-center gap-0.5 text-brand-gold text-xs font-bold hover:underline"
            onClick={() => navigate('/fasting')}
          >
            {t('cycleAnalytics.openFastingTracker', 'Open fasting tracker')}
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </section>
      )}
    </>
  );
}
