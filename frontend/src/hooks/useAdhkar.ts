import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { OfflineQueuedError, sendOrQueue } from '../utils/syncOutbox.js';
import { useAuthStore } from '../store/useAuthStore.js';
import type { AdhkarPeriod } from '../utils/todayTimeline.js';

export interface AdhkarDay {
  date: string;
  morning: boolean;
  evening: boolean;
}

/** Which routines are done on a tracking day (getTrackingDay). */
export function useAdhkarDay(date: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['adhkar', 'day', date],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; day: AdhkarDay }>(
        `/api/adhkar/day?date=${date}`
      );
      return data.day;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

// Marking done is idempotent server-side (the first time is kept), so an
// offline write simply waits in the outbox; networkMode 'always' lets it get
// there instead of pausing in memory.
export function useMarkAdhkarDone() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (vars: { date: string; period: AdhkarPeriod }) => {
      const data = await sendOrQueue<{ ok: boolean; day: AdhkarDay }>({
        tracker: 'adhkar',
        method: 'put',
        url: '/api/adhkar/day',
        body: { ...vars },
        key: `adhkar:${vars.date}:${vars.period}`,
        coalesce: 'replace',
      });
      return data.day;
    },
    onMutate: (vars) => {
      qc.setQueryData<AdhkarDay>(['adhkar', 'day', vars.date], (old) => ({
        date: vars.date,
        morning: old?.morning ?? false,
        evening: old?.evening ?? false,
        [vars.period]: true,
      }));
    },
    onSettled: (_d, e, vars) => {
      if (e instanceof OfflineQueuedError) return; // keep the optimistic flag
      void qc.invalidateQueries({ queryKey: ['adhkar', 'day', vars.date] });
    },
  });
}
