import React from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { PencilIcon, FlagIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { TargetIcon } from '../icons/IslamicIcons.js';

interface GoalData {
  dailyTarget: number;
}

interface TodayData {
  total: number;
  goalMet: boolean;
}

interface GoalCardProps {
  goal?: GoalData;
  today?: TodayData;
  onEditGoal: () => void;
}

const RING = 2 * Math.PI * 50;

export default function GoalCard({ goal, today, onEditGoal }: GoalCardProps) {
  const { t } = useTranslation();
  const { dailyTarget } = goal || { dailyTarget: 100 };
  const { total: todayTotal, goalMet } = today || { total: 0, goalMet: false };

  const progress = Math.min((todayTotal / dailyTarget) * 100, 100);
  const remaining = Math.max(dailyTarget - todayTotal, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full rounded-card border border-brand-border bg-brand-deep text-white shadow-elev-2"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
              <FlagIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
              {t('zikrAnalytics.goalCard.goalTitle', 'Goal')}
            </h3>
            {goalMet && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-brand-emerald-dim text-on-color font-bold uppercase text-[10px] tracking-wider">
                <CheckCircleIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {t('zikrAnalytics.goalCard.achieved', 'Achieved')}
              </span>
            )}
          </div>

          <motion.button
            onClick={onEditGoal}
            whileTap={{ scale: 0.97 }}
            className="w-10 h-10 rounded-control grid place-items-center border border-brand-border bg-brand-surface text-white/70 shadow-elev-1 hover:text-white hover:border-brand-emerald/40 transition-colors"
            title={t('zikrAnalytics.goalCard.editGoal', 'Edit Goal')}
            aria-label={t('zikrAnalytics.goalCard.editGoal', 'Edit Goal')}
          >
            <PencilIcon className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex flex-col items-center justify-center mb-3">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-track"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={goalMet ? 'text-data-good' : 'text-data-mid'}
                strokeDasharray={RING}
                initial={{ strokeDashoffset: RING }}
                animate={{ strokeDashoffset: RING * (1 - progress / 100) }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="font-display text-4xl sm:text-5xl font-bold leading-none tabular-nums">
                {formatLocaleNumber(todayTotal)}
              </div>
              <div className="text-xs font-semibold text-white/70 mt-0.5">
                / {formatLocaleNumber(dailyTarget)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-white tabular-nums">
            {formatLocaleNumber(Number(progress.toFixed(0)))}%
          </div>
        </div>

        {goalMet ? (
          <div className="p-2 rounded-control border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald flex items-center justify-center gap-2">
            <TrophyIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="text-sm font-bold">
              {t('zikrAnalytics.goalCard.congrats', 'Congratulations! Goal Achieved')}
            </span>
          </div>
        ) : (
          <div className="text-center p-2 rounded-control border border-brand-border bg-shade/10">
            <p className="text-sm font-semibold text-white/90">
              {t('zikrAnalytics.goalCard.moreToReach', '{{amount}} more to reach goal', {
                amount: formatLocaleNumber(remaining),
              })}
            </p>
          </div>
        )}

        <div className="mt-3 text-center text-sm font-semibold text-white/70 flex items-center justify-center gap-1.5">
          <TargetIcon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
          {t('zikrAnalytics.goalCard.target', 'Target: {{amount}} zikr/day', {
            amount: formatLocaleNumber(dailyTarget),
          })}
        </div>
      </div>
    </motion.div>
  );
}
