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
  /** Dedicated "real activity" timestamp — set on zikr increments and
   *  sign-in, never by admin actions (see User.lastActiveAt's comment in the
   *  backend model). Null for accounts with no recorded activity yet. */
  lastActiveAt?: string | null;
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

export type UserListSort = 'newest' | 'inactive';

/** Servant-only user directory — a simple paginated list with optional
 *  email/name search, not a full analytics view (see TODO-v3.md).
 *  `sort: 'inactive'` surfaces the least-recently-active users first
 *  (oldest `updatedAt`), server-side across the whole user base — not just
 *  a client-side filter on the current page. */
export function useAdminUserList(
  search: string,
  page: number,
  limit = 25,
  sort: UserListSort = 'newest'
) {
  return useQuery<AdminUserListResult>({
    queryKey: ['admin', 'users', 'list', search, page, limit, sort],
    queryFn: async () => {
      const res = await api.get<AdminUserListResult>('/api/admin/users', {
        params: { search: search || undefined, page, limit, sort },
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
  totalCount: number;
  salatResetDate?: string;
  disabled: boolean;
  disabledAt?: string | null;
  disabledReason?: string | null;
  reengagementEmailSentAt?: string | null;
  reengagementEmailCount: number;
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

/** Draft-then-confirm, same pattern as the re-engagement email — welcome
 *  email is no longer auto-sent (see auth.controller.ts), so this is now the
 *  only way it goes out: the admin always sees and can edit the predefined
 *  text before anything sends. */
export function useWelcomeDraft() {
  return useMutation({
    mutationFn: async (uid: string) => {
      const res = await api.get<{ subject: string; body: string }>(
        `/api/admin/users/${uid}/welcome-draft`
      );
      return res.data;
    },
  });
}

export function useSendWelcomeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, subject, body }: { uid: string; subject: string; body: string }) =>
      api.post(`/api/admin/users/${uid}/welcome-send`, { subject, body }),
    onSuccess: (_data, { uid }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', uid] });
    },
  });
}

/** Fully free-form email to one user — no predefined draft endpoint, the
 *  admin writes subject and body from scratch. */
export function useSendCustomEmail() {
  return useMutation({
    mutationFn: ({ uid, subject, body }: { uid: string; subject: string; body: string }) =>
      api.post(`/api/admin/users/${uid}/custom-email`, { subject, body }),
  });
}

/** Single-UID only, explicit confirm required in the UI — no bulk variant. */
export function useDeleteUser() {
  return useMutation({
    mutationFn: (uid: string) => api.delete(`/api/admin/users/${uid}`),
  });
}

/** Draft-then-confirm, same pattern as the donation/zikr review emails — the
 *  admin always sees and can edit the text before anything sends. */
export function useReengagementDraft() {
  return useMutation({
    mutationFn: async (uid: string) => {
      const res = await api.get<{ subject: string; body: string }>(
        `/api/admin/users/${uid}/reengagement-draft`
      );
      return res.data;
    },
  });
}

export function useSendReengagementEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, subject, body }: { uid: string; subject: string; body: string }) =>
      api.post(`/api/admin/users/${uid}/reengagement-send`, { subject, body }),
    onSuccess: (_data, { uid }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', uid] });
    },
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
