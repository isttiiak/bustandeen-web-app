import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { withHifzDay } from '../utils/hifzDay.js';

export type HifzState = 'new' | 'learning' | 'consolidating' | 'solid';
export type HifzResult = 'easy' | 'hesitant' | 'forgot';

export interface HifzHeatmapRow {
  surah: number;
  totalAyat: number;
  memorised: number;
  solid: number;
  consolidating: number;
  learning: number;
  new: number;
}

export interface HifzSummary {
  profile: {
    dailyNewTarget: number;
    dailyRevisionTarget: number;
    nextSurah: number;
    nextAyah: number;
  };
  today: { newCount: number; revisionCount: number };
  newGoalMet: boolean;
  revisionGoalMet: boolean;
  dueCount: number;
  streak: number;
  bestStreak: number;
  totals: { new: number; learning: number; consolidating: number; solid: number; total: number };
  heatmap: HifzHeatmapRow[];
}

export interface HifzQueueEntry {
  surah: number;
  ayah: number;
  state: HifzState;
  dueDate: string;
  reps: number;
  lapses: number;
  lastResult: HifzResult | null;
}

export interface HifzQueue {
  due: HifzQueueEntry[];
  nextNew: { surah: number; ayah: number } | null;
}

function localTodayStr(): string {
  return getTrackingDay();
}

export function useHifzSummary() {
  const user = useAuthStore((s) => s.user);
  const today = localTodayStr();
  return useQuery({
    queryKey: ['hifz', 'summary', today],
    queryFn: async () => {
      const { data } = await api.get<HifzSummary & { ok: boolean }>(
        `/api/hifz/summary?today=${today}`
      );
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useHifzQueue() {
  const user = useAuthStore((s) => s.user);
  const today = localTodayStr();
  return useQuery({
    queryKey: ['hifz', 'queue', today],
    queryFn: async () => {
      const { data } = await api.get<HifzQueue & { ok: boolean }>(`/api/hifz/queue?today=${today}`);
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

function invalidateHifz(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['hifz'] });
}

/** Start memorising the next ayah at the sequential cursor, then advance it. */
export function useAddNextHifz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{
        ok: boolean;
        entry: { surah: number; ayah: number };
        alreadyExists: boolean;
        cursorExhausted: boolean;
      }>('/api/hifz/next', withHifzDay({}));
      return data;
    },
    onSuccess: () => invalidateHifz(qc),
  });
}

/** Start memorising a specific, user-picked ayah (out of sequence). */
export function useAddHifzEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { surah: number; ayah: number }) => {
      const { data } = await api.post('/api/hifz/entries', withHifzDay(vars));
      return data;
    },
    onSuccess: () => invalidateHifz(qc),
  });
}

export function useRemoveHifzEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { surah: number; ayah: number }) => {
      const { data } = await api.delete('/api/hifz/entries', { data: vars });
      return data;
    },
    onSuccess: () => invalidateHifz(qc),
  });
}

export function useReviewHifz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { surah: number; ayah: number; result: HifzResult }) => {
      const { data } = await api.post('/api/hifz/review', withHifzDay(vars));
      return data;
    },
    onSuccess: () => invalidateHifz(qc),
  });
}

export function useUpdateHifzProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { dailyNewTarget?: number; dailyRevisionTarget?: number }) => {
      const { data } = await api.patch('/api/hifz/profile', vars);
      return data;
    },
    onSuccess: () => invalidateHifz(qc),
  });
}

export function useResetHifzCursor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/hifz/cursor/reset');
      return data;
    },
    onSuccess: () => invalidateHifz(qc),
  });
}
