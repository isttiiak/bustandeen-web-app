import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAiStreakCoach } from '../../hooks/useAi.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { AiBadge, AiDisclaimer } from './AiFlair.js';
import { getTrackingDay } from '../../utils/trackingDay.js';

/**
 * Smart streak coaching — fires when:
 *  · A streak hits a milestone (7, 30, 100, 365)
 *  · A streak breaks (was ≥3 days, now 0)
 *
 * Cached per (day + event + feature) in localStorage so a single coaching
 * moment costs one API call, never more.
 */

const CACHE_KEY = 'bustandeen_streak_coach';
const MILESTONES = [7, 30, 100, 365];

function cacheId(day: string, feature: string, event: string): string {
  return `${day}|${feature}|${event}`;
}

interface CachedCoach {
  id: string;
  message: string;
  tip: string;
}

function readCache(id: string): CachedCoach | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as CachedCoach;
    return raw.id === id ? raw : null;
  } catch {
    return null;
  }
}
function writeCache(data: CachedCoach): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* full */
  }
}

interface StreakEvent {
  event: 'milestone' | 'break';
  feature: string;
  featureLabel: string;
  streakDays: number;
  bestStreak?: number;
}

function detectEvents(
  zikrStreak: number | null,
  quranStreak: number | null,
  salatStreak: number | null,
  prevStreaks: Record<string, number>,
  featureLabels: { zikr: string; quran: string; salat: string }
): StreakEvent | null {
  const checks = [
    { key: 'zikr', label: featureLabels.zikr, streak: zikrStreak },
    { key: 'quran', label: featureLabels.quran, streak: quranStreak },
    { key: 'salat', label: featureLabels.salat, streak: salatStreak },
  ];
  for (const c of checks) {
    if (c.streak == null) continue;
    const prev = prevStreaks[c.key] ?? 0;
    if (c.streak > prev && MILESTONES.includes(c.streak)) {
      return {
        event: 'milestone',
        feature: c.key,
        featureLabel: c.label,
        streakDays: c.streak,
        bestStreak: prev,
      };
    }
    if (c.streak === 0 && prev >= 3) {
      return {
        event: 'break',
        feature: c.key,
        featureLabel: c.label,
        streakDays: prev,
        bestStreak: prev,
      };
    }
  }
  return null;
}

const PREV_KEY = 'bustandeen_prev_streaks';

function readPrev(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PREV_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
function writePrev(streaks: Record<string, number>): void {
  try {
    localStorage.setItem(PREV_KEY, JSON.stringify(streaks));
  } catch {
    /* full */
  }
}

export default function StreakCoaching({
  zikrStreak,
  quranStreak,
  salatStreak,
}: {
  zikrStreak: number | null;
  quranStreak: number | null;
  salatStreak: number | null;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const coach = useAiStreakCoach();
  const [result, setResult] = useState<CachedCoach | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const day = getTrackingDay();
  const prev = readPrev();

  const featureLabels = {
    zikr: t('streakCoaching.zikr', 'Zikr'),
    quran: t('streakCoaching.quran', 'Quran'),
    salat: t('streakCoaching.salat', 'Salat'),
  };

  const streakEvent =
    user && aiEnabled
      ? detectEvents(zikrStreak, quranStreak, salatStreak, prev, featureLabels)
      : null;

  useEffect(() => {
    const cur: Record<string, number> = {};
    if (zikrStreak != null) cur.zikr = zikrStreak;
    if (quranStreak != null) cur.quran = quranStreak;
    if (salatStreak != null) cur.salat = salatStreak;
    if (Object.keys(cur).length) writePrev(cur);
  }, [zikrStreak, quranStreak, salatStreak]);

  useEffect(() => {
    if (!streakEvent) return;
    const id = cacheId(day, streakEvent.feature, streakEvent.event);
    const cached = readCache(id);
    if (cached) {
      setResult(cached);
      return;
    }
    if (coach.isPending) return;
    coach.mutate(
      {
        event: streakEvent.event,
        streakDays: streakEvent.streakDays,
        feature: streakEvent.featureLabel,
        bestStreak: streakEvent.bestStreak,
      },
      {
        onSuccess: (r) => {
          const entry: CachedCoach = { id, message: r.message, tip: r.tip };
          setResult(entry);
          writeCache(entry);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [day, streakEvent?.feature, streakEvent?.event]);

  if (!streakEvent || dismissed || (!result && !coach.isPending)) return null;

  const isMilestone = streakEvent.event === 'milestone';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div
        className={`rounded-2xl border p-4 ${
          isMilestone
            ? 'border-brand-gold/30 bg-gradient-to-br from-brand-gold/10 to-brand-gold/[0.04]'
            : 'border-brand-info/20 bg-brand-info/[0.05]'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <AiBadge
            label={
              isMilestone
                ? t('streakCoaching.milestoneBadge', '{{days}}-day {{feature}} streak!', {
                    days: streakEvent.streakDays,
                    feature: streakEvent.featureLabel,
                  })
                : t('streakCoaching.resetBadge', '{{feature}} streak reset', {
                    feature: streakEvent.featureLabel,
                  })
            }
          />
          <button
            className="text-white/30 hover:text-white text-xs"
            onClick={() => setDismissed(true)}
            aria-label={t('naseehInsights.dismiss', 'Dismiss')}
          >
            {t('naseehInsights.dismiss', 'Dismiss')}
          </button>
        </div>

        {coach.isPending && !result ? (
          <div className="flex items-center gap-2 py-2">
            {['#c9a96e', '#7a9e6e', '#5a9e8e'].map((c, i) => (
              <motion.span
                key={c}
                className="w-2 h-2 rounded-full"
                style={{ background: c }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <span className="text-white/40 text-xs">
              {t('naseeh.findingWords', 'Finding the right words…')}
            </span>
          </div>
        ) : result ? (
          <div className="space-y-1.5">
            <p className="text-white/80 text-sm leading-relaxed">{result.message}</p>
            <p
              className={`text-sm italic ${isMilestone ? 'text-brand-gold/70' : 'text-brand-info/70'}`}
            >
              {result.tip}
            </p>
          </div>
        ) : null}

        <AiDisclaimer />
      </div>
    </motion.div>
  );
}
