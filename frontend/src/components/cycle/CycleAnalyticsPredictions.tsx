import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/outline';
import { FlowerIcon, LeafIcon } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { CycleStats } from '../../utils/cycleStats.js';
import { BAR_TRACK, FOOT, NOTE, fmt, fmtFull } from './cycleAnalyticsParts.js';

/** Expected windows, and the fertile window with the estimated ovulation. */
export function CyclePredictions({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  return (
    <>
      <section className={`${CARD} p-5`}>
        <h2 className={SECTION_TITLE}>
          <FlowerIcon className="w-5 h-5 text-brand-pink" />
          {t('cycleAnalytics.expectedWindows', 'Expected windows')}
        </h2>
        <p className={NOTE}>
          {t(
            'cycleAnalytics.expectedWindowsDesc',
            'Mean cycle ± variability: a window, not a promise. Your body sets the truth.'
          )}
        </p>
        {stats.windows.length === 0 ? (
          <p className="text-white/70 text-sm mt-3">
            {t(
              'cycleAnalytics.logOneCycle',
              'Log at least one cycle and Rayhanah starts forecasting.'
            )}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats.windows.map((w, i) => (
              <motion.div
                key={w.center}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-control bg-brand-pink/10 border border-brand-pink/40 px-4 py-2.5"
              >
                <FlowerIcon className="w-5 h-5 shrink-0 text-brand-pink" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-brand-pink text-sm font-bold">
                    {fmt(w.from)} – {fmt(w.to)}
                  </p>
                  <p className="text-white/70 text-[10px]">
                    {t('cycleAnalytics.mostLikelyAround', 'most likely around {{date}}', {
                      date: fmtFull(w.center),
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {stats.fertileWindows.length > 0 && (
        <section className={`${CARD} p-5`}>
          <h2 className={SECTION_TITLE}>
            <LeafIcon className="w-5 h-5 text-brand-info" />
            {t('cycleAnalytics.fertileWindowTitle', 'Fertile window')}
          </h2>
          <p className={NOTE}>
            {t(
              'cycleAnalytics.fertileWindowDesc',
              'Estimated ovulation ~14 days before the next period. The fertile window spans ~5 days around it.'
            )}
          </p>
          <div className="mt-3 space-y-2">
            {stats.fertileWindows.map((fw, i) => (
              <motion.div
                key={fw.ovulation}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-control bg-brand-info/10 border border-brand-info/40 px-4 py-2.5"
              >
                <LeafIcon className="w-5 h-5 shrink-0 text-brand-info" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-brand-info text-sm font-bold">
                    {fmt(fw.from)} – {fmt(fw.to)}
                  </p>
                  <p className="text-white/70 text-[10px]">
                    {t(
                      'cycleAnalytics.ovulationEstimatedAround',
                      'ovulation estimated around {{date}}',
                      { date: fmtFull(fw.ovulation) }
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className={FOOT}>
            {t(
              'cycleAnalytics.fertileWindowDisclaimer',
              'These are estimates based on your cycle history, not medical advice. The actual ovulation day can vary. For precise tracking, consult a healthcare professional.'
            )}
          </p>
        </section>
      )}
    </>
  );
}

/** The symptoms and moods that tend to appear before a period. */
export function CyclePmsPattern({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  return (
    <>
      {stats.pmsPatterns.length > 0 && (
        <section className={`${CARD} p-5`}>
          <h2 className={SECTION_TITLE}>
            <HeartIcon className="w-5 h-5 text-brand-gold" />
            {t('cycleAnalytics.prePeriodPatternTitle', 'Your pre-period pattern')}
          </h2>
          <p className={NOTE}>
            {t(
              'cycleAnalytics.prePeriodPatternDesc',
              'Symptoms and moods that tend to appear in the week before your period (based on {{count, number}} cycle(s)).',
              { count: stats.pmsPeriodsAnalyzed }
            )}
          </p>
          <div className="mt-3 space-y-1.5">
            {stats.pmsPatterns.map((p) => (
              <div key={p.key} className="flex items-center gap-2 text-xs">
                <span className="text-white/80 w-28 truncate">
                  {p.key.startsWith('mood:')
                    ? t(`cycleAnalytics.moodLabel.${p.key.replace('mood:', '')}`, p.label)
                    : t(`cycleAnalytics.symptom.${p.key}`, p.label)}
                </span>
                <div className={`${BAR_TRACK} h-3`}>
                  <div
                    className="h-full rounded-full bg-brand-gold/70"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                <span className="text-brand-gold font-bold w-10 text-right tabular-nums">
                  {formatLocaleNumber(p.pct)}%
                </span>
              </div>
            ))}
          </div>
          <p className={FOOT}>
            {stats.pmsPeriodsAnalyzed < 3
              ? t(
                  'cycleAnalytics.logMoreCycles',
                  'Log more cycles with daily symptoms and moods to sharpen this pattern.'
                )
              : t(
                  'cycleAnalytics.patternsStrengthen',
                  'These patterns strengthen with every cycle you track.'
                )}
          </p>
        </section>
      )}
    </>
  );
}
