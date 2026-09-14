import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface AdminUserListItem {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  country?: string;
  city?: string;
  createdAt: string;
  aiEnabled: boolean;
  welcomeEmailSentAt?: string | null;
}

interface AdminUserListResult {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

/** Servant-only user directory — a simple paginated list with optional
 *  email/name search, not a full analytics view (see TODO-v3.md). */
export function useAdminUserList(search: string, page: number, limit = 25) {
  return useQuery<AdminUserListResult>({
    queryKey: ['admin', 'users', 'list', search, page, limit],
    queryFn: async () => {
      const res = await api.get<AdminUserListResult>('/api/admin/users', {
        params: { search: search || undefined, page, limit },
      });
      return res.data;
    },
    staleTime: 15_000,
  });
}

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
