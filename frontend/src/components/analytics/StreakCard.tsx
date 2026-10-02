import React, { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { FireIcon, TrophyIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import {
  PauseIcon,
  PlayIcon,
  BoltIcon,
  CheckCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FrostIcon, LeafIcon } from '../icons/IslamicIcons.js';
import type { ChartDataPoint } from '../../types/api.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';

interface StreakData {
  currentStreak?: number;
  longestStreak?: number;
  isPaused?: boolean;
}

interface StreakCardProps {
  streak?: StreakData;
  onPause: () => void;
  onResume: () => void;
  isLoading: boolean;
  chartData?: ChartDataPoint[];
  dailyGoal?: number | null;
  todayTotal?: number;
  /** True only for a confirmed zero-LIFETIME-total user (not "zero today") —
   * swaps the bare 0/0 headline for an inviting first-timer message instead
   * of implying they've already failed at something. */
  isNewUser?: boolean;
}

// Data tokens (global.css): bright on paper, the brand colours on dark.
const BAR = {
  met: 'rgb(var(--c-data-good) / 0.85)',
  half: 'rgb(var(--c-data-good) / 0.45)',
  partial: 'rgb(var(--c-data-mid) / 0.6)',
  grace: 'rgb(var(--c-info) / 0.5)',
  missed: 'rgb(var(--c-data-none) / 0.45)',
  empty: 'var(--track)',
};

function heatmapColor(total: number, goal: number | null | undefined): string {
  if (total === 0) return BAR.empty;
  if (!goal) return BAR.half;
  const pct = total / goal;
  if (pct >= 1) return BAR.met;
  if (pct >= 0.5) return BAR.half;
  if (pct > 0) return BAR.partial;
  return BAR.empty;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return formatLocaleDate(d, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function StreakCard({
  streak,
  onPause,
  onResume,
  isLoading,
  chartData,
  dailyGoal,
  todayTotal = 0,
  isNewUser = false,
}: StreakCardProps) {
  const { t } = useTranslation();
  const { currentStreak, longestStreak, isPaused } = streak || {};
  const [showInfo, setShowInfo] = useState(false);

  // Last 7 days from chartData (most recent last)
  const last7 = (chartData ?? []).slice(-7);

  // Streak-at-risk: after 6 PM, streak active, today < goal
  const hour = new Date().getHours();
  const remaining = dailyGoal ? Math.max(0, dailyGoal - todayTotal) : 0;
  const streakAtRisk = (currentStreak ?? 0) > 0 && !isPaused && hour >= 18 && remaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`h-full rounded-card border bg-brand-deep text-white shadow-elev-2 ${
        isPaused
          ? 'border-brand-pink/40'
          : streakAtRisk
            ? 'border-brand-gold/50'
            : 'border-brand-border'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
            {isPaused ? (
              <span className="inline-flex items-center gap-2">
                <PauseIcon className="w-5 h-5 text-brand-pink" aria-hidden="true" />
                <span className="px-2 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wider border border-brand-pink/40 bg-brand-pink/10 text-brand-pink">
                  {t('zikrAnalytics.streakCard.paused', 'Paused')}
                </span>
              </span>
            ) : (
              <>
                <FireIcon className="w-5 h-5 text-brand-warm" aria-hidden="true" />
                {t('zikrAnalytics.streakCard.streakTitle', 'Streak')}
              </>
            )}
          </h3>

          <motion.button
            onClick={isPaused ? onResume : onPause}
            disabled={isLoading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className={`w-10 h-10 rounded-control grid place-items-center border shadow-elev-1 transition-colors ${
              isPaused
                ? 'border-brand-emerald/50 bg-brand-emerald/15 text-brand-emerald'
                : 'border-brand-border bg-brand-surface text-white/70 hover:text-white hover:border-brand-emerald/40'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/50 disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label={
              isPaused
                ? t('zikrAnalytics.streakCard.resumeStreak', 'Resume Streak')
                : t('zikrAnalytics.streakCard.pauseStreak', 'Pause Streak')
            }
            title={
              isPaused
                ? t('zikrAnalytics.streakCard.resumeStreak', 'Resume Streak')
                : t('zikrAnalytics.streakCard.pauseStreak', 'Pause Streak')
            }
          >
            {isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
          </motion.button>
        </div>

        {/* Paused banner */}
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-control border border-brand-pink/30 bg-brand-pink/10"
          >
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-brand-pink" />
              <span className="text-brand-pink">
                {t(
                  'zikrAnalytics.streakCard.pausedBanner',
                  "Streak paused: counts won't increase until you resume"
                )}
              </span>
            </div>
          </motion.div>
        )}

        {/* Streak-at-risk alert */}
        {streakAtRisk && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center justify-between gap-3 px-3 py-2.5 rounded-control border border-brand-gold/50 bg-brand-gold/10"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ExclamationTriangleIcon className="w-4 h-4 text-brand-gold shrink-0" />
              <p className="text-xs font-bold text-brand-gold leading-tight">
                {t(
                  'zikrAnalytics.streakCard.atRisk',
                  '{{remaining}} more to protect your {{streak}}-day streak!',
                  {
                    remaining: formatLocaleNumber(remaining),
                    streak: formatLocaleNumber(currentStreak ?? 0),
                  }
                )}
              </p>
            </div>
            <Link
              to="/zikr"
              className="shrink-0 px-2.5 py-1 rounded-control bg-brand-emerald-dim text-on-color text-[11px] font-bold whitespace-nowrap hover:brightness-110 transition"
            >
              {t('zikrAnalytics.streakCard.countNow', 'Count now →')}
            </Link>
          </motion.div>
        )}

        {/* Current / Best row */}
        {isNewUser ? (
          <div className="text-center py-3 mb-3 border-y border-brand-border">
            <p className="text-sm font-bold text-white/80 inline-flex items-center gap-1.5">
              <LeafIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
              {t('zikrAnalytics.streakCard.newUserTitle', 'Start your first streak today')}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {t(
                'zikrAnalytics.streakCard.newUserHint',
                'Meet your daily goal once to light the fire — every streak starts at day one.'
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center">
              <div className="font-display text-6xl sm:text-5xl font-bold leading-none text-brand-gold tabular-nums">
                {formatLocaleNumber(currentStreak || 0)}
              </div>
              <p className="mt-1.5 text-xs font-bold text-white/80">
                {t('zikrAnalytics.streakCard.dayStreak', 'Day Streak')}
              </p>
            </div>

            <div className="text-center border-l border-brand-border">
              <div className="font-display text-5xl sm:text-4xl font-bold leading-none text-white tabular-nums pt-1">
                {formatLocaleNumber(longestStreak || 0)}
              </div>
              <p className="mt-1.5 text-xs font-bold text-white/80 flex items-center justify-center gap-1">
                {t('zikrAnalytics.streakCard.best', 'Best')}
                <TrophyIcon className="w-3.5 h-3.5 text-brand-gold" aria-hidden="true" />
              </p>
            </div>
          </div>
        )}

        {/* 7-day heatmap with streak-status tags */}
        {last7.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 font-bold">
              {t('zikrAnalytics.streakCard.last7Days', 'Last 7 days')}
            </p>
            <div className="flex gap-1.5 items-end">
              {last7.map((day, i) => {
                const isToday = i === last7.length - 1;
                const color =
                  day.status === 'grace'
                    ? BAR.grace // frozen: the streak survived this miss
                    : day.status === 'missed'
                      ? BAR.missed
                      : heatmapColor(day.total, dailyGoal);
                const pct = dailyGoal
                  ? Math.min(1, day.total / dailyGoal)
                  : day.total > 0
                    ? 0.6
                    : 0;
                const height = 8 + Math.round(pct * 20); // 8–28px
                const tagTip =
                  day.status === 'grace'
                    ? ' - grace day (streak survived, you got a chance!)'
                    : day.status === 'missed'
                      ? ' - missed'
                      : day.status === 'pending'
                        ? ' - in progress'
                        : '';
                return (
                  <div
                    key={day.date}
                    className="tooltip flex-1"
                    data-tip={`${formatShortDate(day.date)}: ${formatLocaleNumber(day.total)} zikr${dailyGoal ? ` (${Math.round((day.total / dailyGoal) * 100)}% of goal)` : ''}${tagTip}`}
                  >
                    {/* Status tag above the bar */}
                    <p className="flex justify-center leading-none mb-0.5 h-3">
                      {day.status === 'grace' && (
                        <FrostIcon className="w-3 h-3 text-brand-info" aria-label="grace day" />
                      )}
                      {day.status === 'missed' && (
                        <XMarkIcon className="w-3 h-3 text-data-none" aria-label="missed" />
                      )}
                      {day.status === 'met' && (
                        <CheckIcon className="w-3 h-3 text-data-good" aria-label="goal met" />
                      )}
                    </p>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
                      style={{
                        height: Math.max(
                          height,
                          day.status === 'grace' || day.status === 'missed' ? 12 : height
                        ),
                        background: color,
                        originY: 1,
                      }}
                      className={`w-full rounded-t-sm ${isToday ? 'ring-1 ring-white/40' : ''}`}
                    />
                    <p
                      className={`text-[9px] text-center mt-0.5 ${isToday ? 'text-white font-bold' : 'text-white/50'}`}
                    >
                      {formatLocaleDate(new Date(day.date + 'T12:00:00'), { weekday: 'narrow' })}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {[
                { color: BAR.met, label: t('zikrAnalytics.streakCard.legendGoalMet', 'goal met') },
                {
                  color: BAR.grace,
                  label: t('zikrAnalytics.streakCard.legendGrace', 'grace (chance used)'),
                },
                { color: BAR.missed, label: t('zikrAnalytics.streakCard.legendMissed', 'missed') },
                {
                  color: BAR.partial,
                  label: t('zikrAnalytics.streakCard.legendPartial', 'partial'),
                },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ background: color }}
                  />
                  <span className="text-[10px] text-white/60">{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors"
            >
              <InformationCircleIcon className="w-3.5 h-3.5 shrink-0" />
              {t('zikrAnalytics.streakCard.howStreaksInfo', 'How streaks & grace days work')}
            </button>
          </div>
        )}

        {/* Status line */}
        {!isPaused && (currentStreak ?? 0) > 0 && !streakAtRisk && (
          <motion.div
            className="p-2 rounded-control border border-brand-emerald/30 bg-brand-emerald/10 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-xs text-center font-semibold text-brand-emerald flex items-center justify-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" />{' '}
              {t('zikrAnalytics.streakCard.keepItUp', 'Keep it up! Strong habit.')}
            </p>
          </motion.div>
        )}

        {isPaused && (
          <motion.div
            className="p-2 rounded-control border border-brand-border bg-shade/10 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <PauseIcon className="w-4 h-4" />{' '}
                {t('zikrAnalytics.streakCard.safeResume', 'Safe. Resume anytime!')}
              </p>
              <motion.button
                onClick={onResume}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-[11px] font-bold text-on-color bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 disabled:opacity-60"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                {t('zikrAnalytics.streakCard.resumeNow', 'Resume now')}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* How streaks work — collapsed by default; opened via the "i" hint above the heatmap */}
        <div className="rounded-control border border-brand-border bg-shade/10 overflow-hidden">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="w-full p-3 flex items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-bold text-white/90 flex items-center gap-1.5">
              <BoltIcon className="w-4 h-4 text-brand-gold" />{' '}
              {t('zikrAnalytics.streakCard.howItWorks', 'How Streaks Work')}
            </span>
            <InformationCircleIcon
              className={`w-4 h-4 text-white/50 transition-transform ${showInfo ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 space-y-1.5 text-sm text-white/80">
                  <p className="flex items-start gap-2 text-xs text-brand-info">
                    <FrostIcon className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
                    <span>
                      {t(
                        'zikrAnalytics.streakCard.graceExplainer',
                        'Grace day: you missed it but the streak survived. Backfill it from "Log Missed Counts" (up to 2 days back) to turn it green.'
                      )}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t(
                        'zikrAnalytics.streakCard.howItWorks1',
                        'Complete your daily zikr goal to continue your streak'
                      )}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <FireIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t(
                        'zikrAnalytics.streakCard.howItWorks2',
                        'Miss 1 day? No problem! You get a 24-hour grace period'
                      )}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <PauseIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t(
                        'zikrAnalytics.streakCard.howItWorks3',
                        'Pause anytime to preserve your streak safely'
                      )}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <LockClosedIcon className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-80" />
                    <span className="text-xs italic opacity-75">
                      {t(
                        'zikrAnalytics.streakCard.howItWorks4',
                        'Note: Missing 2+ days in a row will reset your streak'
                      )}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
