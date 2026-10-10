import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { OfflineQueuedError, sendOrQueue } from '../utils/syncOutbox.js';
import { useAuthStore } from '../store/useAuthStore.js';
import type { FastingCategory, FastingStatus, VoluntaryKind } from '../utils/fastingRules.js';

export interface FastingLog {
  _id: string;
  tarawih?: boolean;
  userId: string;
  date: string;
  category: FastingCategory;
  voluntaryKind?: VoluntaryKind;
  vowId?: string;
  status: FastingStatus;
  hijri?: string;
  note?: string;
}

export interface FastingVow {
  id: string;
  title: string;
  targetDays: number;
  completed: number;
}

export interface FastingSummary {
  profile: {
    qadaOwed: number;
    kaffarah: { active: boolean; targetDays: number; startDate?: string };
    vows: FastingVow[];
  };
  qadaCompleted: number;
  kaffarah: { completed: number; currentRun: number; runStale: boolean };
  stats: {
    total: number;
    thisMonth: number;
    last30: number;
    voluntaryTotal: number;
    monThuStreak: number;
    bestMonThuStreak: number;
    /** Fresh-start day these stats count from (U7), or null. */
    since?: string | null;
  };
  recentLogs: FastingLog[];
}

// Fasting uses civil midnight, NOT the Fajr tracking day — a fast covers
// dawn-to-sunset of a calendar date, so "today" must be the wall-clock date.
export function localTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useFastingLog(date: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['fasting', 'log', date],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; log: FastingLog | null }>(
        `/api/fasting?date=${date}`
      );
      return data.log;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useFastingSummary() {
  const user = useAuthStore((s) => s.user);
  const today = localTodayStr();
  return useQuery({
    queryKey: ['fasting', 'summary', today],
    queryFn: async () => {
      const { data } = await api.get<FastingSummary & { ok: boolean }>(
        `/api/fasting/summary?today=${today}`
      );
      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });
}

export interface UpsertFastingVars {
  date: string;
  category: FastingCategory;
  voluntaryKind?: VoluntaryKind;
  vowId?: string;
  status: FastingStatus;
  hijri?: string;
  note?: string;
  /** Ramadan nights: tarawih prayed */
  tarawih?: boolean;
}

const offlineToast = () =>
  toast("You're offline. Your fast is saved here and will sync when you're back online.", {
    icon: '📶',
    id: 'fasting-offline',
  });

// Both writes carry the day's full end state, so offline they coalesce per
// date: the last one for a day is the one that syncs (a clear after a log
// replaces it). networkMode 'always' lets an offline write reach the outbox
// instead of being paused in memory (see useSalatLog).
export function useUpsertFastingLog() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (vars: UpsertFastingVars) => {
      const data = await sendOrQueue<{ ok: boolean; log: FastingLog }>({
        tracker: 'fasting',
        method: 'put',
        url: '/api/fasting/log',
        body: { ...vars },
        key: `fasting:log:${vars.date}`,
        coalesce: 'replace',
      });
      return data.log;
    },
    onMutate: async (vars) => {
      const key = ['fasting', 'log', vars.date];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FastingLog | null>(key);
      qc.setQueryData<FastingLog | null>(key, (old) => ({
        _id: old?._id ?? '',
        userId: old?.userId ?? '',
        date: vars.date,
        category: vars.category,
        voluntaryKind: vars.voluntaryKind,
        vowId: vars.vowId,
        status: vars.status,
        hijri: vars.hijri,
        note: vars.note,
      }));
      return { previous, key };
    },
    onError: (e, _v, ctx) => {
      if (e instanceof OfflineQueuedError) return offlineToast(); // keep the optimistic state
      // Roll back AND tell the user — a silent revert looks like a broken button
      if (ctx) qc.setQueryData(ctx.key, ctx.previous);
      toast.error('Could not save your fast — check your connection and try again.', {
        id: 'fasting-save',
      });
    },
    onSettled: (_d, e, vars) => {
      if (e instanceof OfflineQueuedError) return; // nothing changed server-side yet
      void qc.invalidateQueries({ queryKey: ['fasting', 'log', vars.date] });
      void qc.invalidateQueries({ queryKey: ['fasting', 'summary'] });
      void qc.invalidateQueries({ queryKey: ['fasting', 'history'] });
    },
  });
}

export function useClearFastingLog() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (date: string) => {
      await sendOrQueue({
        tracker: 'fasting',
        method: 'delete',
        url: `/api/fasting/log?date=${date}`,
        key: `fasting:log:${date}`,
        coalesce: 'replace',
      });
      return date;
    },
    onMutate: async (date) => {
      const key = ['fasting', 'log', date];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FastingLog | null>(key);
      qc.setQueryData<FastingLog | null>(key, null);
      return { previous, key };
    },
    onError: (e, _v, ctx) => {
      if (e instanceof OfflineQueuedError) return offlineToast();
      if (ctx) qc.setQueryData(ctx.key, ctx.previous);
      toast.error('Could not remove the log — try again.', { id: 'fasting-clear' });
    },
    onSettled: (_d, e, date) => {
      if (e instanceof OfflineQueuedError) return;
      void qc.invalidateQueries({ queryKey: ['fasting', 'log', date] });
      void qc.invalidateQueries({ queryKey: ['fasting', 'summary'] });
      void qc.invalidateQueries({ queryKey: ['fasting', 'history'] });
    },
  });
}

/** Full log history (calendar picker + analytics page). */
export function useFastingHistory(days = 365, enabled = true) {
  const user = useAuthStore((s) => s.user);
  const today = localTodayStr();
  return useQuery({
    queryKey: ['fasting', 'history', days, today],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; logs: FastingLog[] }>(
        `/api/fasting/history?days=${days}&today=${today}`
      );
      return data.logs;
    },
    enabled: !!user && enabled,
    staleTime: 60_000,
  });
}

export function useUpdateFastingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      qadaOwed?: number;
      kaffarah?: { active: boolean; targetDays: number; startDate?: string };
    }) => {
      const { data } = await api.patch('/api/fasting/profile', vars);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fasting', 'summary'] });
    },
    onError: () => toast.error('Could not update settings — try again.', { id: 'fasting-profile' }),
  });
}

export function useAddVow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { title: string; targetDays: number }) => {
      const { data } = await api.post('/api/fasting/vows', vars);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fasting', 'summary'] });
    },
    onError: () => toast.error('Could not add the vow — try again.', { id: 'fasting-vow' }),
  });
}

export function useDeleteVow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vowId: string) => {
      const { data } = await api.delete(`/api/fasting/vows/${vowId}`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fasting', 'summary'] });
    },
    onError: () => toast.error('Could not delete the vow — try again.', { id: 'fasting-vow' }),
  });
}
