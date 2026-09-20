import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuranSummary } from '../hooks/useQuran.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useAiComeback } from '../hooks/useAi.js';
import { AiPanel, AiBadge, AiDisclaimer } from './ai/AiFlair.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { useAuthStore } from '../store/useAuthStore.js';

/**
 * The comeback nudge — the highest-leverage moment in a habit app.
 *
 * "Away" means away from the APP, not from one feature: a day only counts as
 * quiet when BOTH Quran units and zikr counts are zero (Istiak: it fired for a
 * user mid-zikr-streak whose Quran happened to be 0 — wrong). The line is
 * generated ONCE PER DAY and cached in localStorage so a returning user costs
 * a single tiny AI call, never one per page view.
 */

const CACHE_KEY = 'bustandeen_comeback_nudge';

function readCache(day: string): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as {
      day?: string;
      message?: string;
    };
    return raw.day === day && raw.message ? raw.message : null;
  } catch {
    return null;
  }
}
function writeCache(day: string, message: string): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ day, message }));
  } catch {
    /* full */
  }
}

export default function ComebackNudge() {
  const { t } = useTranslation();
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const { data: summary } = useQuranSummary();
  const { data: zikrData } = useAnalytics(7);
  const comeback = useAiComeback();
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // A day is quiet only when Quran AND zikr are both untouched.
  const zikrByDate = new Map((zikrData?.chartData ?? []).map((d) => [d.date, d.total ?? 0]));
  const last7 = summary?.last7 ?? [];
  const isQuiet = (d: { date: string; units: number } | undefined) =>
    !!d && (d.units ?? 0) === 0 && (zikrByDate.get(d.date) ?? 0) === 0;

  // Count the quiet run ending yesterday; today must be quiet SO FAR too —
  // someone already counting dhikr doesn't need a "welcome back".
  let daysAway = 0;
  if (summary && zikrData && last7.length >= 2 && isQuiet(last7[last7.length - 1])) {
    for (let i = last7.length - 2; i >= 0; i--) {
      if (!isQuiet(last7[i])) break;
      daysAway++;
    }
  }
  // aiEnabled gate was missing here — every sibling AI component (Streak-
  // Coaching, MuhasabahReport, FastingCompanion) already checks it before
  // firing; this one didn't, so an opted-out user with no Groq key of their
  // own still got a real reply from the app's shared key.
  const show = aiEnabled && daysAway >= 2 && !dismissed;

  useEffect(() => {
    if (!show) return;
    const day = getTrackingDay();
    const cached = readCache(day);
    if (cached) {
      setMessage(cached);
      return;
    }
    if (comeback.isPending || message) return;
    comeback.mutate(
      { daysAway, bestStreak: summary?.bestStreak ?? 0 },
      {
        onSuccess: (r) => {
          setMessage(r.message);
          writeCache(day, r.message);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [show, daysAway]);

  if (!show || !message) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <AiPanel>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AiBadge label={t('comebackNudge.welcomeBack')} />
            <button
              className="text-white/30 hover:text-white text-xs"
              onClick={() => setDismissed(true)}
              aria-label={t('comebackNudge.dismiss')}
            >
              {t('comebackNudge.dismiss')}
            </button>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{message}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to="/quran/browse"
              className="btn btn-xs rounded-xl border-0 text-white font-bold bg-brand-emerald hover:bg-brand-emerald-dim"
            >
              {t('comebackNudge.readOneAyah')}
            </Link>
            <Link
              to="/zikr"
              className="btn btn-xs rounded-xl bg-white/5 border-brand-emerald/15 text-white/70"
            >
              {t('comebackNudge.oneDhikr')}
            </Link>
          </div>
          <AiDisclaimer />
        </div>
      </AiPanel>
    </motion.div>
  );
}
