import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAiFastingCompanion } from '../../hooks/useAi.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { AiBadge, AiDisclaimer } from './AiFlair.js';
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

  if (!user || !aiEnabled || dismissed || (!message && !companion.isPending)) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div
        className={`rounded-2xl border p-3.5 ${
          isPostMaghrib
            ? 'border-brand-gold/25 bg-gradient-to-br from-brand-gold/10 to-brand-warm/[0.04]'
            : 'border-brand-emerald/20 bg-brand-emerald/[0.05]'
        }`}
      >
        <AiBadge
          label={
            isPostMaghrib
              ? t('fastingCompanion.nearIftar', 'Naseeh · near iftar')
              : t('fastingCompanion.fastingToday', 'Naseeh · fasting today')
          }
        />
        {companion.isPending && !message ? (
          <div className="flex items-center gap-2 mt-2">
            {['#c9a96e', '#7a9e6e', '#5a9e8e'].map((c, i) => (
              <motion.span
                key={c}
                className="w-2 h-2 rounded-full"
                style={{ background: c }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        ) : (
          <p
            className={`text-sm leading-relaxed mt-2 ${
              isPostMaghrib ? 'text-brand-gold/80' : 'text-white/70'
            }`}
          >
            {message}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <AiDisclaimer />
          <button
            className="text-white/20 hover:text-white/50 text-[10px]"
            onClick={() => setDismissed(true)}
          >
            {t('naseehInsights.dismiss', 'Dismiss')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
