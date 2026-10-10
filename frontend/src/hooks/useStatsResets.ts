import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';

/** Stats fresh start (U7): backend/src/services/statsReset.service.ts. */
export const STATS_AREAS = ['zikr', 'salat', 'fasting', 'quran'] as const;
export type StatsArea = (typeof STATS_AREAS)[number];

export interface AreaReset {
  date: string | null;
  history: Array<{ date: string; note: string; resetAt: string }>;
}
export type StatsResets = Record<StatsArea, AreaReset>;

const KEY = ['statsResets'] as const;

export function useStatsResets() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; resets: StatsResets }>('/api/stats/resets');
      return data.resets;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

/** A reset moves the cutoff every stat of that area reads. */
function useAfterReset() {
  const qc = useQueryClient();
  return (resets: StatsResets) => {
    qc.setQueryData(KEY, resets);
    for (const key of ['analytics', 'zikr', 'salat', 'fasting', 'quran', 'home']) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useResetStats() {
  const after = useAfterReset();
  return useMutation({
    // The start day is the TRACKING day (CLAUDE.md), like the salat reset.
    mutationFn: async (vars: { areas: StatsArea[]; note?: string }) => {
      const { data } = await api.post<{ ok: boolean; resets: StatsResets }>('/api/stats/reset', {
        areas: vars.areas,
        note: vars.note || undefined,
        today: getTrackingDay(),
      });
      return data.resets;
    },
    onSuccess: after,
  });
}

export function useUndoStatsReset() {
  const after = useAfterReset();
  return useMutation({
    mutationFn: async (area: StatsArea) => {
      const { data } = await api.post<{ ok: boolean; resets: StatsResets }>(
        '/api/stats/reset/undo',
        { area }
      );
      return data.resets;
    },
    onSuccess: after,
  });
}
