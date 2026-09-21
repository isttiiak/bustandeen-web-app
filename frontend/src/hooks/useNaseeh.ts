import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { getUserTimezoneOffset } from '../utils/timezone.js';
import { weekIdForMuhasabah } from '../utils/muhasabahCorpus.js';

/**
 * Naseeh page data. Every number comes from the user's own logs on the server;
 * the model only re-words a sentence (numbers are checked) or picks which
 * lookup to run for a question. See backend naseehInsights.service.ts.
 */

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type DataQueryId =
  | 'salat_missed'
  | 'salat_prayed'
  | 'salat_rate'
  | 'salat_streak'
  | 'kaza_owed'
  | 'zikr_total'
  | 'zikr_streak'
  | 'quran_read'
  | 'quran_streak'
  | 'fasting_days';
export type DataPeriod = 'today' | 'week' | 'month' | 'year';

export interface PatternFinding {
  id: string;
  kind: 'strength' | 'timing' | 'attention';
  text: string;
  original?: string;
}
export interface PatternInsightsData {
  findings: PatternFinding[];
  ai: boolean;
  windowDays: number;
}
export interface KazaPlanData {
  totalOwed: number;
  startWith: PrayerId | null;
  anchorPrayer: PrayerId | null;
  daysToClear: number;
  clearedBy: string | null;
  twoPerDayClearedBy: string | null;
  lines: string[];
  originalHeadline?: string;
  ai: boolean;
}
export interface DataAnswerData {
  answered: boolean;
  answer: string;
  reason?: 'unsupported' | 'unavailable';
}

// ── Re-word cache ────────────────────────────────────────────────────────────
// A model re-word is reused for the rest of the week, but ONLY while our own
// computed sentence is unchanged (so a re-worded number can never go stale).
interface RewordCache {
  weekId: string;
  /** true once a re-word was attempted this week, so a failing model is not retried on every visit */
  tried: boolean;
  items: Record<string, { original: string; text: string }>;
}

function readCache(key: string): RewordCache | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null') as RewordCache | null;
    if (raw && raw.weekId === weekIdForMuhasabah()) return raw;
  } catch {
    /* unreadable cache = no cache */
  }
  return null;
}
function writeCache(key: string, items: RewordCache['items']): void {
  try {
    const entry: RewordCache = { weekId: weekIdForMuhasabah(), tried: true, items };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* storage full or blocked: skip caching */
  }
}

const PATTERN_KEY = 'bustandeen_naseeh_patterns';
const KAZA_KEY = 'bustandeen_naseeh_kaza';

/** Phrased request first (once per week); if it fails, plain computed text. */
async function getWithRephrase<T>(url: string, tried: boolean): Promise<T> {
  if (!tried) {
    try {
      const { data } = await api.get<T & { ok: boolean }>(`${url}&phrase=1`);
      return data;
    } catch {
      /* fall through to the free, computed-only call */
    }
  }
  const { data } = await api.get<T & { ok: boolean }>(`${url}&phrase=0`);
  return data;
}

export function usePatternInsights() {
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const today = getTrackingDay();
  const tz = getUserTimezoneOffset();
  return useQuery({
    queryKey: ['naseeh', 'patterns', today, tz],
    enabled: !!user && aiEnabled,
    staleTime: 6 * 60 * 60_000,
    queryFn: async (): Promise<PatternInsightsData> => {
      const cache = readCache(PATTERN_KEY);
      const data = await getWithRephrase<PatternInsightsData>(
        `/api/naseeh/pattern-insights?today=${today}&timezoneOffset=${tz}`,
        !!cache?.tried
      );
      const findings = data.findings ?? [];
      // Fresh re-word: remember it. Otherwise re-apply last time's, if still valid.
      const fresh = findings.filter((f) => f.original);
      if (fresh.length > 0) {
        writeCache(
          PATTERN_KEY,
          Object.fromEntries(fresh.map((f) => [f.id, { original: f.original!, text: f.text }]))
        );
      } else if (!cache) {
        writeCache(PATTERN_KEY, {});
      } else {
        for (const f of findings) {
          const hit = cache.items[f.id];
          if (hit && hit.original === f.text) f.text = hit.text;
        }
      }
      return {
        findings,
        ai: fresh.length > 0 || Object.keys(cache?.items ?? {}).length > 0,
        windowDays: data.windowDays ?? 90,
      };
    },
  });
}

export function useKazaPlan() {
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const today = getTrackingDay();
  return useQuery({
    queryKey: ['naseeh', 'kaza-plan', today],
    enabled: !!user && aiEnabled,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<KazaPlanData> => {
      const cache = readCache(KAZA_KEY);
      const data = await getWithRephrase<KazaPlanData>(
        `/api/naseeh/kaza-plan?today=${today}`,
        !!cache?.tried
      );
      const lines = [...(data.lines ?? [])];
      if (data.originalHeadline) {
        writeCache(KAZA_KEY, {
          headline: { original: data.originalHeadline, text: lines[0] ?? '' },
        });
        return { ...data, lines };
      }
      if (!cache) {
        writeCache(KAZA_KEY, {});
      } else {
        const hit = cache.items['headline'];
        if (hit && lines[0] === hit.original) lines[0] = hit.text;
      }
      return { ...data, lines };
    },
  });
}

export function useAskNaseeh() {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await api.post<DataAnswerData>('/api/naseeh/ask', {
        question,
        today: getTrackingDay(),
        timezoneOffset: getUserTimezoneOffset(),
      });
      return data;
    },
  });
}

export function useDataAnswer() {
  return useMutation({
    mutationFn: async (vars: { query: DataQueryId; period?: DataPeriod; prayer?: PrayerId }) => {
      const { data } = await api.post<DataAnswerData>('/api/naseeh/data-answer', {
        ...vars,
        today: getTrackingDay(),
        timezoneOffset: getUserTimezoneOffset(),
      });
      return data;
    },
  });
}

// ── Weekly plan ───────────────────────────────────────────────────────────────
// Worked out on the server from the user's own logs. No AI is used for it, so
// there is no re-word cache here.
export interface PlanTarget {
  kind: 'zikr' | 'quran' | 'salat';
  dailyAmount?: number;
  prayer?: PrayerId;
  daysTarget: number;
  title: string;
  reason: string;
  done: number;
  effectiveDaysTarget: number;
  daysLeft: number;
  met: boolean;
}
export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  status: 'paused' | 'not-enough-data' | 'steady' | 'ready' | 'accepted';
  headline: string;
  targets: PlanTarget[];
  acceptedAt: string | null;
}
export interface PlanAdjustment {
  kind: PlanTarget['kind'];
  dailyAmount?: number;
  daysTarget?: number;
}

export function useWeeklyPlan() {
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const today = getTrackingDay();
  const tz = getUserTimezoneOffset();
  return useQuery({
    queryKey: ['naseeh', 'plan', today, tz],
    enabled: !!user && aiEnabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WeeklyPlan> => {
      const { data } = await api.get<WeeklyPlan & { ok: boolean }>(
        `/api/naseeh/plan?today=${today}&timezoneOffset=${tz}`
      );
      return data;
    },
  });
}

export function useAcceptPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targets: PlanAdjustment[]) => {
      const { data } = await api.post<WeeklyPlan & { ok: boolean }>('/api/naseeh/plan/accept', {
        today: getTrackingDay(),
        timezoneOffset: getUserTimezoneOffset(),
        targets,
      });
      return data;
    },
    onSuccess: () => {
      // Accepting changes the dhikr and Quran daily goals, so refresh anything showing them.
      void qc.invalidateQueries({ queryKey: ['naseeh', 'plan'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
      void qc.invalidateQueries({ queryKey: ['quran'] });
    },
  });
}
