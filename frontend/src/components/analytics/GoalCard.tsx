import React from 'react';
import { m as motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { PencilIcon, FlagIcon, SparklesIcon, TrophyIcon } from '@heroicons/react/24/outline';

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

export default function GoalCard({ goal, today, onEditGoal }: GoalCardProps) {
  const { t } = useTranslation();
  const { dailyTarget } = goal || { dailyTarget: 100 };
  const { total: todayTotal, goalMet } = today || { total: 0, goalMet: false };
  const prefersReducedMotion = useReducedMotion();

  const progress = Math.min((todayTotal / dailyTarget) * 100, 100);
  const remaining = Math.max(dailyTarget - todayTotal, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[1.25rem] backdrop-blur-2xl border border-brand-emerald/10 bg-brand-deep/60 text-white shadow-glass"
    >
      {goalMet && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute block w-1 h-1 rounded-full"
              style={{
                left: `${(i * 53) % 100}%`,
                top: `${(i * 37) % 100}%`,
                background:
                  i % 3 === 0
                    ? 'var(--brand-emerald)'
                    : i % 3 === 1
                      ? 'var(--brand-warm)'
                      : 'var(--brand-gold)',
                boxShadow: '0 0 4px rgba(255,255,255,0.3)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                prefersReducedMotion
                  ? { opacity: [0, 0.6, 0] }
                  : { scale: [0, 0.8, 0], opacity: [0, 0.6, 0], y: [-4, -8, -12] }
              }
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.15, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full blur-3xl bg-gradient-radial from-brand-warm/15 to-transparent"
        animate={prefersReducedMotion ? {} : { scale: [1, 1.03, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -left-20 w-80 h-80 rounded-full blur-3xl bg-gradient-radial from-brand-warm/10 to-transparent"
        animate={prefersReducedMotion ? {} : { scale: [1.03, 1, 1.03] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 relative z-20">
            <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2 text-white/95">
              <FlagIcon className="w-5 h-5 drop-shadow" />
              {t('zikrAnalytics.goalCard.goalTitle', 'Goal')}
            </h3>
            {goalMet && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                className="inline-flex items-center"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-brand-emerald/90 text-[var(--brand-deep)] font-black uppercase text-[10px] tracking-wider shadow-[0_4px_16px_rgba(0,0,0,0.3)] border border-brand-emerald/30 ring-1 ring-inset ring-brand-gold/30">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-brand-emerald-dim" />
                  {t('zikrAnalytics.goalCard.achieved', 'Achieved')}
                </span>
              </motion.div>
            )}
          </div>

          <motion.button
            onClick={onEditGoal}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="w-10 h-10 rounded-2xl grid place-items-center border border-brand-emerald/30 bg-white/10 text-white hover:bg-white/15 transition-colors"
            title={t('zikrAnalytics.goalCard.editGoal', 'Edit Goal')}
          >
            <PencilIcon className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex flex-col items-center justify-center mb-3">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32">
            <svg
              className="w-full h-full transform -rotate-90 drop-shadow-xl"
              viewBox="0 0 120 120"
            >
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--brand-emerald)" />
                  <stop offset="30%" stopColor="var(--brand-gold)" />
                  <stop offset="60%" stopColor="var(--brand-warm)" />
                  <stop offset="100%" stopColor="#c4825a" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/15"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - progress / 100) }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
                style={{ filter: 'drop-shadow(0 0 10px rgba(196,130,90,0.6))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <motion.div
                className="text-4xl sm:text-5xl font-black leading-none"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              >
                {formatLocaleNumber(todayTotal)}
              </motion.div>
              <div className="text-xs font-semibold text-white/80 mt-0.5">
                / {formatLocaleNumber(dailyTarget)}
              </div>
            </div>
          </div>
          <motion.div
            className="mt-2 text-3xl font-black tracking-tight text-white"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {formatLocaleNumber(Number(progress.toFixed(0)))}%
          </motion.div>
        </div>

        {goalMet ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-2 bg-gradient-to-r from-brand-emerald/20 via-brand-gold/20 to-brand-warm/20 rounded-lg backdrop-blur-sm border border-brand-emerald/20 flex items-center justify-center gap-2"
          >
            <TrophyIcon className="w-5 h-5" />
            <span className="text-sm font-extrabold tracking-wide">
              {t('zikrAnalytics.goalCard.congrats', 'Congratulations! Goal Achieved')}
            </span>
          </motion.div>
        ) : (
          <motion.div
            className="text-center p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-brand-emerald/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <p className="text-sm font-semibold text-white/90 flex items-center justify-center gap-1.5">
              {t('zikrAnalytics.goalCard.moreToReach', '{{amount}} more to reach goal', {
                amount: formatLocaleNumber(remaining),
              })}
            </p>
          </motion.div>
        )}

        <div className="mt-2 text-center text-md font-semibold text-white/70 flex items-center justify-center gap-1">
          <SparklesIcon className="w-3 h-3" />{' '}
          {t('zikrAnalytics.goalCard.target', 'Target: {{amount}} zikr/day', {
            amount: formatLocaleNumber(dailyTarget),
          })}
        </div>
      </div>
    </motion.div>
  );
}
