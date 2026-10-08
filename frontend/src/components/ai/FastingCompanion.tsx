import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAiFastingCompanion } from '../../hooks/useAi.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { AiBadge, AiDisclaimer, AiFallbackNote, AiThinking } from './AiFlair.js';
import { CARD } from '../bustanStyles.js';
import { getTrackingDay } from '../../utils/trackingDay.js';

/**
 * Fasting day companion — a gentle daily AI message during an active fast.
 *
 * Morning: intention/focus for the day.
 * Evening: acknowledgement + anticipation of iftar.
 *
 * Cached per (day + period + fastType) in localStorage — one API call per
 * fasting day per period at most.
 */

const CACHE_KEY = 'bustandeen_fasting_companion';

function cacheId(day: string, period: string, fastType: string): string {
  return `${day}|${period}|${fastType}`;
}

interface CachedMsg {
  id: string;
  message: string;
}

function readCache(id: string): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as CachedMsg;
    return raw.id === id ? raw.message : null;
  } catch {
    return null;
  }
}
function writeCache(id: string, message: string): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ id, message }));
  } catch {
    /* full */
  }
}

export default function FastingCompanion({
  fastType,
  dayNumber,
  isPostMaghrib,
}: {
  fastType: string;
  dayNumber?: number;
  isPostMaghrib: boolean;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const companion = useAiFastingCompanion();
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // The AI request failed: show the plain, non-AI version (nothing is cached,
  // so the next visit tries the AI again).
  const failed = companion.isError;

  const day = getTrackingDay();
  const period = isPostMaghrib ? 'evening' : 'morning';
  const id = cacheId(day, period, fastType);

  useEffect(() => {
    if (!user || !aiEnabled) return;
    const cached = readCache(id);
    if (cached) {
      setMessage(cached);
      return;
    }
    if (companion.isPending || message) return;
    companion.mutate(
      { period, fastType, dayNumber },
      {
        onSuccess: (r) => {
          setMessage(r.message);
          writeCache(id, r.message);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [user, aiEnabled, id]);

  if (!user || !aiEnabled || dismissed || (!message && !companion.isPending && !failed)) {
    return null;
  }
  const fallback =
    !message && failed
      ? isPostMaghrib
        ? t(
            'fastingCompanion.fallbackEvening',
            'Iftar is close. May Allah accept your fast and your duʿāʾ.'
          )
        : t(
            'fastingCompanion.fallbackMorning',
            'May Allah accept your fast today. Take the day gently, with your heart in remembrance.'
          )
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className={`${CARD} p-4 ${isPostMaghrib ? '!border-brand-gold/40' : ''}`}>
        <AiBadge
          label={
            isPostMaghrib
              ? t('fastingCompanion.nearIftar', 'Naseeh · near iftar')
              : t('fastingCompanion.fastingToday', 'Naseeh · fasting today')
          }
        />
        {companion.isPending && !message && !fallback ? (
          <AiThinking label={t('naseeh.findingWords', 'Finding the right words…')} />
        ) : (
          <p
            className={`text-sm leading-relaxed mt-2 ${
              isPostMaghrib ? 'text-brand-gold' : 'text-white/80'
            }`}
          >
            {message ?? fallback}
          </p>
        )}
        <div className="flex items-start justify-between gap-3 mt-2">
          {fallback ? <AiFallbackNote feature="coaching" /> : <AiDisclaimer feature="coaching" />}
          <button
            className="text-white/60 hover:text-white text-[11px] shrink-0"
            onClick={() => setDismissed(true)}
          >
            {t('naseehInsights.dismiss', 'Dismiss')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
