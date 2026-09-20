import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FireIcon, TrophyIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import {
  PauseIcon,
  PlayIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
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

function heatmapColor(total: number, goal: number | null | undefined): string {
  if (total === 0) return 'rgba(255,255,255,0.06)';
  if (!goal) return 'rgba(122,158,110,0.5)';
  const pct = total / goal;
  if (pct >= 1) return 'rgba(122,158,110,0.85)';
  if (pct >= 0.5) return 'rgba(122,158,110,0.45)';
  if (pct > 0) return 'rgba(201,169,110,0.55)';
  return 'rgba(255,255,255,0.06)';
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
  const prefersReducedMotion = useReducedMotion();
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
      className={`relative overflow-hidden rounded-[1.25rem] backdrop-blur-2xl border bg-brand-deep/60 text-white shadow-glass ${
        isPaused
          ? 'border-brand-pink/40'
          : streakAtRisk
            ? 'border-brand-gold/50'
            : 'border-brand-emerald/10'
      }`}
    >
      <motion.div
        className="pointer-events-none absolute -top-20 -left-16 w-72 h-72 rounded-full blur-3xl bg-gradient-radial from-brand-gold/15 to-transparent"
        animate={prefersReducedMotion ? {} : { scale: [1, 1.03, 1], opacity: [0.25, 0.35, 0.25] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 rounded-full blur-3xl bg-gradient-radial from-brand-warm/10 to-transparent"
        animate={prefersReducedMotion ? {} : { scale: [1.05, 1, 1.05] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      <div className="relative z-10 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <motion.h3
            className="text-base sm:text-lg font-extrabold flex items-center gap-2"
            animate={{}}
            transition={{}}
          >
            {isPaused ? (
              <span className="relative inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-pink shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse" />
                <span className="px-2 py-0.5 rounded-full text-[11px] uppercase font-black tracking-wider bg-gradient-to-r from-brand-warm/90 via-brand-warm/80 to-brand-gold/80 text-white ring-1 ring-inset ring-brand-pink/40">
                  {t('zikrAnalytics.streakCard.paused', 'Paused')}
                </span>
              </span>
            ) : (
              <>
                <FireIcon className="w-5 h-5" />
                {t('zikrAnalytics.streakCard.streakTitle', 'Streak')}
              </>
            )}
          </motion.h3>

          <motion.button
            onClick={isPaused ? onResume : onPause}
            disabled={isLoading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className={`w-10 h-10 rounded-2xl grid place-items-center border ${
              isPaused
                ? 'border-brand-emerald/40 bg-brand-emerald/15'
                : 'border-brand-emerald/30 bg-white/10'
            } backdrop-blur-md hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed`}
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
            className="mb-3 relative overflow-hidden rounded-lg border border-brand-pink/30 bg-gradient-to-r from-brand-pink/20 via-brand-warm/20 to-brand-pink/20 text-white backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wider">
              <ExclamationTriangleIcon className="w-4 h-4 text-fuchsia-200" />
              <span className="text-fuchsia-100">
                {t(
                  'zikrAnalytics.streakCard.pausedBanner',
                  "Streak Paused — counts won't increase until you resume"
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
            className="mb-3 flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-brand-gold/50 bg-brand-gold/10"
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
              className="shrink-0 px-2.5 py-1 rounded-lg bg-brand-gold text-brand-deep text-[11px] font-black whitespace-nowrap hover:bg-brand-gold transition-colors"
            >
              {t('zikrAnalytics.streakCard.countNow', 'Count now →')}
            </Link>
          </motion.div>
        )}

        {/* Current / Best row */}
        {isNewUser ? (
          <div className="text-center py-3 mb-3 border-y border-brand-emerald/10">
            <p className="text-sm font-bold text-white/80">
              {t('zikrAnalytics.streakCard.newUserTitle', '🌱 Start your first streak today')}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {t(
                'zikrAnalytics.streakCard.newUserHint',
                'Meet your daily goal once to light the fire — every streak starts at day one.'
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center">
              <motion.div className="text-8xl sm:text-5xl font-black drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] bg-gradient-to-tr from-brand-gold via-brand-gold to-brand-warm bg-clip-text text-transparent">
                {formatLocaleNumber(currentStreak || 0)}
              </motion.div>
              <p className="text-xs font-bold text-white/80">
                {t('zikrAnalytics.streakCard.dayStreak', 'Day Streak')}
              </p>
            </div>

            <div className="text-center border-l border-brand-emerald/10">
              <motion.div
                className="relative inline-block px-2 py-1"
                whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
              >
                <span className="absolute -inset-3 rounded-full bg-gradient-radial from-brand-gold/25 to-transparent blur-md" />
                {!prefersReducedMotion && (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <motion.span
                        key={i}
                        className="absolute rounded-full blur-xl opacity-30"
                        style={{
                          width: `${18 + (i % 3) * 8}px`,
                          height: `${18 + (i % 3) * 8}px`,
                          left: ['-18%', '35%', '110%'][i],
                          top: ['-10%', '-15%', '0%'][i],
                          background:
                            i % 2 === 0
                              ? 'radial-gradient(circle, rgba(214,197,43,0.3) 0%, rgba(214,197,43,0) 70%)'
                              : 'radial-gradient(circle, rgba(199,87,171,0.25) 0%, rgba(199,87,171,0) 70%)',
                        }}
                        initial={{ scale: 0.9, opacity: 0.3 }}
                        animate={{ scale: [0.9, 1.05, 0.95, 1], opacity: [0.3, 0.5, 0.35, 0.4] }}
                        transition={{ duration: 6 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ))}
                  </>
                )}
                <span
                  className="relative text-6xl sm:text-4xl font-black"
                  style={{
                    background: 'linear-gradient(180deg,#fff,#f5f3c4)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {formatLocaleNumber(longestStreak || 0)}
                </span>
              </motion.div>
              <p className="text-sm font-bold text-white/70 flex items-center justify-center gap-1">
                {t('zikrAnalytics.streakCard.best', 'Best')} <TrophyIcon className="w-3 h-3" />
              </p>
            </div>
          </div>
        )}

        {/* 7-day heatmap with streak-status tags */}
        {last7.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-bold">
              {t('zikrAnalytics.streakCard.last7Days', 'Last 7 days')}
            </p>
            <div className="flex gap-1.5 items-end">
              {last7.map((day, i) => {
                const isToday = i === last7.length - 1;
                const color =
                  day.status === 'grace'
                    ? 'rgba(6,182,212,0.45)' // frozen — the streak survived this miss
                    : day.status === 'missed'
                      ? 'rgba(248,113,113,0.4)'
                      : heatmapColor(day.total, dailyGoal);
                const pct = dailyGoal
                  ? Math.min(1, day.total / dailyGoal)
                  : day.total > 0
                    ? 0.6
                    : 0;
                const height = 8 + Math.round(pct * 20); // 8–28px
                const tagTip =
                  day.status === 'grace'
                    ? ' — 🧊 grace day (streak survived, you got a chance!)'
                    : day.status === 'missed'
                      ? ' — ✖ missed'
                      : day.status === 'pending'
                        ? ' — in progress'
                        : '';
                return (
                  <div
                    key={day.date}
                    className="tooltip flex-1"
                    data-tip={`${formatShortDate(day.date)}: ${formatLocaleNumber(day.total)} zikr${dailyGoal ? ` (${Math.round((day.total / dailyGoal) * 100)}% of goal)` : ''}${tagTip}`}
                  >
                    {/* Status tag above the bar */}
                    <p className="text-center text-[10px] leading-none mb-0.5 h-3">
                      {day.status === 'grace' && <span aria-label="grace day">🧊</span>}
                      {day.status === 'missed' && (
                        <span className="text-red-400/80" aria-label="missed">
                          ✖
                        </span>
                      )}
                      {day.status === 'met' && (
                        <span className="text-brand-emerald/70" aria-label="goal met">
                          ✓
                        </span>
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
                      className={`w-full rounded-t-sm ${isToday ? 'ring-1 ring-white/30' : ''}`}
                    />
                    <p
                      className={`text-[9px] text-center mt-0.5 ${isToday ? 'text-white/60 font-bold' : 'text-white/20'}`}
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
                {
                  color: 'rgba(122,158,110,0.85)',
                  label: t('zikrAnalytics.streakCard.legendGoalMet', '✓ goal met'),
                },
                {
                  color: 'rgba(90,158,142,0.45)',
                  label: t('zikrAnalytics.streakCard.legendGrace', '🧊 grace (chance used)'),
                },
                {
                  color: 'rgba(248,113,113,0.4)',
                  label: t('zikrAnalytics.streakCard.legendMissed', '✖ missed'),
                },
                {
                  color: 'rgba(201,169,110,0.55)',
                  label: t('zikrAnalytics.streakCard.legendPartial', 'partial'),
                },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ background: color }}
                  />
                  <span className="text-[9px] text-white/25">{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-white/55 transition-colors"
            >
              <InformationCircleIcon className="w-3.5 h-3.5 shrink-0" />
              {t('zikrAnalytics.streakCard.howStreaksInfo', 'How streaks & grace days work')}
            </button>
          </div>
        )}

        {/* Status line */}
        {!isPaused && (currentStreak ?? 0) > 0 && !streakAtRisk && (
          <motion.div
            className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-brand-emerald/15 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-xs text-center font-semibold text-white/90 flex items-center justify-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" />{' '}
              {t('zikrAnalytics.streakCard.keepItUp', 'Keep it up! Strong habit.')}
            </p>
          </motion.div>
        )}

        {isPaused && (
          <motion.div
            className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-brand-emerald/15 mb-2"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black text-white bg-brand-emerald/80 hover:bg-brand-emerald/90 border border-brand-emerald/40 disabled:opacity-60"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                {t('zikrAnalytics.streakCard.resumeNow', 'Resume now')}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* How streaks work — collapsed by default; opened via the "i" hint above the heatmap */}
        <div className="rounded-lg border border-brand-emerald/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="w-full p-3 flex items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-bold text-white/90 flex items-center gap-1.5">
              <BoltIcon className="w-4 h-4" />{' '}
              {t('zikrAnalytics.streakCard.howItWorks', 'How Streaks Work')}
            </span>
            <InformationCircleIcon
              className={`w-4 h-4 text-white/30 transition-transform ${showInfo ? 'rotate-180' : ''}`}
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
                  <p className="flex items-start gap-2 text-xs text-cyan-200/80">
                    <span aria-hidden>🧊</span>
                    <span>
                      {t(
                        'zikrAnalytics.streakCard.graceExplainer',
                        'Grace day = you missed it but the streak survived. Backfill it from "Log Missed Counts" (up to 2 days back) to turn it green.'
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
