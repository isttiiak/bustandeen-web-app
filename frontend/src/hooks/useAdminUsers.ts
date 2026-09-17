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
  disabled: boolean;
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

export interface AdminUserDetail extends AdminUserListItem {
  updatedAt: string;
  totalCount: number;
  zikrTypes: { name: string }[];
  salatResetDate?: string;
  disabled: boolean;
  disabledAt?: string | null;
  disabledReason?: string | null;
}

/** Servant-only single-user profile summary — not a full data editor. */
export function useAdminUserDetail(uid: string) {
  return useQuery<AdminUserDetail>({
    queryKey: ['admin', 'users', 'detail', uid],
    queryFn: async () => {
      const res = await api.get<{ user: AdminUserDetail }>(`/api/admin/users/${uid}`);
      return res.data.user;
    },
    enabled: !!uid,
  });
}

export function useResendWelcomeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => api.post(`/api/admin/users/${uid}/resend-welcome`),
    onSuccess: (_data, uid) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', uid] });
    },
  });
}

/** Single-UID only, explicit confirm required in the UI — no bulk variant. */
export function useDeleteUser() {
  return useMutation({
    mutationFn: (uid: string) => api.delete(`/api/admin/users/${uid}`),
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason?: string }) =>
      api.post(`/api/admin/users/${uid}/disable`, { reason }),
    onSuccess: (_data, { uid }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', uid] });
    },
  });
}

export function useEnableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => api.post(`/api/admin/users/${uid}/enable`),
    onSuccess: (_data, uid) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', uid] });
    },
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
