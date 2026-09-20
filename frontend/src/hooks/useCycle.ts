import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';

export interface CycleActive {
  type: 'hayd' | 'nifas';
  startDate: string;
  dayCount: number;
  maxDays: number;
  beyondMax: boolean;
}

export type CycleFlow = 'light' | 'medium' | 'heavy';
export type CycleMood = 'calm' | 'happy' | 'low' | 'irritable' | 'anxious' | 'tired';

export interface CycleDayNote {
  date: string;
  flow: CycleFlow | null;
  symptoms: string[];
  moods: CycleMood[];
  /** Garden of Light checklist — ids of items completed that day */
  garden: string[];
}

export interface CycleSummary {
  active: CycleActive | null;
  prediction: {
    nextStart: string | null;
    avgCycleDays: number;
    avgPeriodDays: number;
    basedOnCycles: number;
  };
  madhab: 'hanafi' | 'majority';
  logs: Array<{ _id: string; type: 'hayd' | 'nifas'; startDate: string; endDate: string | null }>;
  days: CycleDayNote[];
  partnerSync: { enabled: boolean; partnerUid: string | null };
  pregnancy: { active: boolean; dueDate: string | null; weeksAlong: number | null };
}

/** True for signed-in female users — the only ones who see Rayhanah UI. */
export function useIsFemale(): boolean {
  const user = useAuthStore((s) => s.user);
  return user?.gender === 'female';
}

export function useCycleSummary(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  const today = getTrackingDay();
  return useQuery({
    queryKey: ['cycle', 'summary', today],
    queryFn: async () => {
      const { data } = await api.get<CycleSummary & { ok: boolean }>(
        `/api/cycle/summary?today=${today}`
      );
      return data;
    },
    enabled: !!user && isFemale && enabled,
    staleTime: 60_000,
  });
}

/** Just the active state — for Salat/Fasting/Home excused checks. */
export function useCycleActive(): CycleActive | null {
  const { data } = useCycleSummary();
  return data?.active ?? null;
}

export function useStartCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { date: string; type: 'hayd' | 'nifas' }) => {
      const { data } = await api.post('/api/cycle/start', vars);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Could not save — try again.', { id: 'cycle-start' });
    },
  });
}

export function useEndCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { date: string }) => {
      const { data } = await api.post('/api/cycle/end', vars);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Could not save — try again.', { id: 'cycle-end' });
    },
  });
}

/** Opt-in, revocable status-only sharing with one existing friend. */
export function usePartnerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { enabled: boolean; partnerUid?: string }) => {
      const { data } = await api.patch<{
        ok: boolean;
        enabled: boolean;
        partnerUid: string | null;
      }>('/api/cycle/partner-sync', vars);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Could not update — try again.', { id: 'cycle-partner-sync' });
    },
  });
}

export function useSetMadhab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (madhab: 'hanafi' | 'majority') => {
      const { data } = await api.patch('/api/cycle/profile', { madhab });
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: () => toast.error('Could not update setting.', { id: 'cycle-madhab' }),
  });
}

/** Pregnancy status — suspends hayd predictions only; salat/fasting are
 * untouched (that stays a per-day fiqh decision, not an automatic exemption). */
export function useSetPregnancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { active: boolean; dueDate?: string }) => {
      const { data } = await api.patch('/api/cycle/pregnancy', vars);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Could not update pregnancy status.', { id: 'cycle-pregnancy' });
    },
  });
}

/** Backfill a completed past episode (history import). */
export function useAddPastCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { startDate: string; endDate: string; type: 'hayd' | 'nifas' }) => {
      const { data } = await api.post('/api/cycle/logs', { ...vars, today: getTrackingDay() });
      return data;
    },
    onSuccess: () => {
      toast.success('Past cycle added — predictions just got smarter 🌸', { id: 'cycle-past' });
      void qc.invalidateQueries({ queryKey: ['cycle'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Could not add that cycle.', { id: 'cycle-past' });
    },
  });
}

/** Save today's wellness note (flow / symptoms / mood / garden checklist) — optimistic, silent. */
export function useUpsertCycleDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      date: string;
      flow?: CycleFlow | null;
      symptoms?: string[];
      moods?: CycleMood[];
      garden?: string[];
    }) => {
      const { data } = await api.put('/api/cycle/day', vars);
      return data;
    },
    onMutate: async (vars) => {
      // Optimistic merge into every cached cycle summary
      await qc.cancelQueries({ queryKey: ['cycle'] });
      qc.setQueriesData<CycleSummary & { ok: boolean }>(
        { queryKey: ['cycle', 'summary'] },
        (old) => {
          if (!old) return old;
          const days = [...(old.days ?? [])];
          const i = days.findIndex((d) => d.date === vars.date);
          const prev =
            i >= 0
              ? days[i]!
              : { date: vars.date, flow: null, symptoms: [], moods: [], garden: [] };
          const next = {
            ...prev,
            ...(vars.flow !== undefined ? { flow: vars.flow } : {}),
            ...(vars.symptoms !== undefined ? { symptoms: vars.symptoms } : {}),
            ...(vars.moods !== undefined ? { moods: vars.moods } : {}),
            ...(vars.garden !== undefined ? { garden: vars.garden } : {}),
          };
          if (i >= 0) days[i] = next;
          else days.push(next);
          return { ...old, days };
        }
      );
    },
    onError: () => {
      toast.error('Could not save your note — try again.', { id: 'cycle-day' });
      void qc.invalidateQueries({ queryKey: ['cycle'] });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['cycle', 'summary'] }),
  });
}

/** Edit an episode's dates, or endDate:null to REOPEN it ("I'm not done
 * yet") — daily wellness notes are untouched either way. */
export function useEditCycleLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { logId: string; startDate?: string; endDate?: string | null }) => {
      const { logId, ...body } = vars;
      const { data } = await api.patch(`/api/cycle/logs/${logId}`, body);
      return data as { ok: boolean };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Could not update the cycle — try again.', { id: 'cycle-edit' });
    },
  });
}

export function useDeleteCycleLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      await api.delete(`/api/cycle/logs/${logId}`);
      return logId;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cycle'] }),
    onError: () => toast.error('Could not delete entry.', { id: 'cycle-del' }),
  });
}

export interface BodyStats {
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
}

export function useBodyStats() {
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  return useQuery({
    queryKey: ['cycle', 'bodyStats'],
    queryFn: async () => {
      const { data } = await api.get<BodyStats & { ok: boolean }>('/api/cycle/body-stats');
      return data;
    },
    enabled: !!user && isFemale,
    staleTime: 300_000,
  });
}

export function useUpdateBodyStats() {
  const qc = useQueryClient();
  return useMutation({
    // null clears that value ("remove my height/weight")
    mutationFn: async (vars: { heightCm?: number | null; weightKg?: number | null }) => {
      const { data } = await api.patch<BodyStats & { ok: boolean }>('/api/cycle/body-stats', vars);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['cycle', 'bodyStats'], data);
    },
    onError: () => toast.error('Could not save body stats — try again.', { id: 'cycle-body' }),
  });
}
