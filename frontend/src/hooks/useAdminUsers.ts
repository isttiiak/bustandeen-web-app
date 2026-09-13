import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export function useWelcomeBackfillStatus() {
  return useQuery<{ missing: number }>({
    queryKey: ['admin', 'users', 'welcome-backfill'],
    queryFn: async () => {
      const res = await api.get<{ missing: number }>('/api/admin/users/welcome-backfill');
      return res.data;
    },
    staleTime: 30_000,
  });
}

/** Owner-only, deliberately manual — sending a batch of real emails is
 *  something the admin should trigger on purpose, never a side effect. */
export function useSendWelcomeBackfill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ sent: number; remaining: number }>(
        '/api/admin/users/welcome-backfill'
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'welcome-backfill'] });
    },
  });
}
