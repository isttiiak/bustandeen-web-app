import type React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  FireIcon,
  TrophyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { MosqueIcon, PrayerGlyph, TasbihIcon } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import type { SalatAnalytics } from '../../hooks/useSalatLog.js';
import { PRAYER_META } from '../../utils/prayerTimes.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';

/** One card per prayer: completion, the stats and the streaks. */
export function SalatPerPrayerCards({ data }: { data: SalatAnalytics }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h2 className={SECTION_TITLE}>
        <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
        {t('salatAnalytics.perPrayer')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRAYER_META.filter((p) => p.isTrackable).map((prayer, i) => {
          const stats = data.perPrayer[prayer.id] ?? {
            completed: 0,
            kaza: 0,
            missed: 0,
            pending: 0,
            mosque: 0,
            jamat: 0,
            tasbeeh: 0,
            currentStreak: 0,
            bestStreak: 0,
          };
          const total = data.totalDays;
          const done = stats.completed + stats.kaza;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const stat = (
            Icon: React.ComponentType<{ className?: string }>,
            cls: string,
            text: string
          ) => (
            <span className="flex items-center gap-1.5 min-w-0">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${cls}`} aria-hidden="true" />
              <span className="truncate">{text}</span>
            </span>
          );
          return (
            <motion.div
              key={prayer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className={CARD}
            >
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-9 h-9 rounded-full border border-brand-border bg-shade/10 flex items-center justify-center text-brand-emerald">
                    <PrayerGlyph id={prayer.id} className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-display font-bold text-white text-base">
                    {t(`salatAnalytics.prayerName.${prayer.id}`)}
                  </h3>
                </div>
                <div className="text-3xl font-black text-white mb-0.5 tabular-nums">
                  {formatLocaleNumber(pct)}%
                </div>
                <p className="text-white/60 text-xs mb-2">
                  {t('salatAnalytics.prayedFormula', {
                    done: formatLocaleNumber(done),
                    total: formatLocaleNumber(total),
                  })}
                </p>
                <div className="w-full bg-track rounded-full h-1.5 mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.05 * i }}
                    className="h-full bg-data-good rounded-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-white/80">
                  {stat(
                    CheckIcon,
                    'text-data-good',
                    t('salatAnalytics.onTimeStat', {
                      count: formatLocaleNumber(stats.completed),
                    })
                  )}
                  {stat(
                    ClockIcon,
                    'text-data-mid',
                    t('salatAnalytics.kazaStat', {
                      count: formatLocaleNumber(stats.kaza),
                    })
                  )}
                  {stat(
                    XMarkIcon,
                    'text-data-none',
                    t('salatAnalytics.missedStat', {
                      count: formatLocaleNumber(stats.missed),
                    })
                  )}
                  {stat(
                    MosqueIcon,
                    'text-white/60',
                    t('salatAnalytics.mosqueStat', {
                      count: formatLocaleNumber(stats.mosque),
                    })
                  )}
                  {stats.tasbeeh > 0 && (
                    <span className="col-span-2">
                      {stat(
                        TasbihIcon,
                        'text-white/60',
                        t('salatAnalytics.tasbeehStat', {
                          count: formatLocaleNumber(stats.tasbeeh),
                        })
                      )}
                    </span>
                  )}
                </div>
                {(stats.currentStreak > 0 || stats.bestStreak > 0) && (
                  <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-brand-border text-xs text-white/80">
                    {stat(
                      FireIcon,
                      'text-brand-warm',
                      t('salatAnalytics.prayerStreakCurrent', {
                        count: formatLocaleNumber(stats.currentStreak),
                      })
                    )}
                    {stat(
                      TrophyIcon,
                      'text-brand-gold',
                      t('salatAnalytics.prayerStreakBest', {
                        count: formatLocaleNumber(stats.bestStreak),
                      })
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
