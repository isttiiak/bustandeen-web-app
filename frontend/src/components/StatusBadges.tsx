import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StreakState } from '../types/api.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { FireIcon, PauseIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { FrostIcon, TargetIcon } from './icons/IslamicIcons.js';

/**
 * Shared streak & goal capsules (Home card, Navbar, ZikrCounter).
 * Streak: flame active · frost in the grace day (complete today to save it) ·
 *         muted red flame with 0 when dead · pause when paused.
 * Goal:   target with % while in progress · trophy when completed.
 * SVG icons only; colours come from the theme's data/brand tokens (audit T3.2).
 */

export function streakVisual(
  state: StreakState | undefined,
  streak: number,
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string
): {
  Icon: (p: { className?: string }) => React.ReactNode;
  cls: string;
  tip: string;
  iconCls?: string;
} {
  if (state === 'paused') {
    return {
      Icon: PauseIcon,
      iconCls: 'text-brand-pink',
      cls: 'bg-brand-pink/15 border-brand-pink/40',
      tip: t('statusBadges.streakPaused', 'Streak paused. Resume from analytics'),
    };
  }
  if (state === 'grace') {
    return {
      Icon: FrostIcon,
      iconCls: 'text-brand-info',
      cls: 'bg-brand-info/15 border-brand-info/50',
      tip: t(
        'statusBadges.streakFrozen',
        "Streak frozen! Complete today's goal to keep your {{streak}}-day streak alive",
        { streak: formatLocaleNumber(streak) }
      ),
    };
  }
  if (streak <= 0 || state === 'none') {
    return {
      Icon: FireIcon,
      iconCls: 'text-red-400',
      cls: 'bg-red-400/15 border-red-400/50',
      tip: t('statusBadges.noStreak', 'No streak yet. Meet your daily goal to light the fire'),
    };
  }
  return {
    Icon: FireIcon,
    iconCls: 'text-brand-gold',
    cls: 'bg-brand-gold/20 border-brand-gold/40',
    tip: t('statusBadges.streakActive', '{{streak}}-day streak, keep it burning!', {
      streak: formatLocaleNumber(streak),
    }),
  };
}

export function StreakBadge({
  streak,
  state,
  size = 'sm',
}: {
  streak: number;
  state?: StreakState;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  const v = streakVisual(state, streak, t);
  const dead = streak <= 0 || state === 'none';
  return (
    <div className="tooltip tooltip-bottom" data-tip={v.tip}>
      <span
        className={`rounded-full border font-bold flex items-center gap-1 text-white ${v.cls} ${
          size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'
        }`}
      >
        <v.Icon className={`w-3.5 h-3.5 shrink-0 ${v.iconCls ?? ''}`} />
        <span className={dead ? 'text-red-300' : state === 'grace' ? 'text-brand-info' : ''}>
          {formatLocaleNumber(Math.max(0, streak))}
        </span>
      </span>
    </div>
  );
}

export function GoalBadge({
  pct,
  met,
  size = 'sm',
}: {
  pct: number | null;
  met: boolean;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  if (pct === null) return null;
  return (
    <div
      className="tooltip tooltip-bottom"
      data-tip={
        met
          ? t('statusBadges.goalAchieved', 'Daily goal achieved, māshā’Allāh!')
          : t('statusBadges.goalPct', "{{pct}}% of today's goal", { pct: formatLocaleNumber(pct) })
      }
    >
      <span
        className={`rounded-full border font-bold flex items-center gap-1 text-white ${
          met
            ? 'bg-brand-emerald/25 border-brand-emerald/50'
            : 'bg-shade/20 border-brand-emerald/30'
        } ${size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}
      >
        {met ? (
          <TrophyIcon className="w-3.5 h-3.5 shrink-0 text-brand-emerald" aria-hidden="true" />
        ) : (
          <TargetIcon className="w-3.5 h-3.5 shrink-0 text-brand-emerald" />
        )}
        {/* Ink, not sage: sage text on the sage tint fails contrast (axe). */}
        <span>{met ? `${formatLocaleNumber(100)}%` : `${formatLocaleNumber(pct)}%`}</span>
      </span>
    </div>
  );
}
