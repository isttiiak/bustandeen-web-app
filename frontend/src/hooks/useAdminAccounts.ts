import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type { AdminRole, AnsarDomain } from '../store/useAdminStore.js';

export interface AdminAccountListItem {
  id: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  ansarDomain: AnsarDomain | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

/** Servant-only — the full Servant/Ansar roster (see adminAccount.routes.ts). */
export function useAdminAccounts() {
  return useQuery<AdminAccountListItem[]>({
    queryKey: ['admin', 'accounts'],
    queryFn: async () => {
      const res = await api.get<{ accounts: AdminAccountListItem[] }>('/api/admin/accounts');
      return res.data.accounts;
    },
    staleTime: 10_000,
  });
}

/** How the server set up the Firebase side of a new admin: a new account, an
 *  existing verified one linked as is (keeps its own password), or an
 *  unverified one reclaimed onto the password typed in the form. */
export type AdminFirebaseLink = 'created' | 'linked' | 'reclaimed';

/** Servant-only — registers a new admin, creating its Firebase account if
 *  one doesn't already exist for the email. This is the ONLY way to add an
 *  Ansar after the initial deploy-time bootstrap. */
export function useCreateAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      displayName?: string;
      role: AdminRole;
      ansarDomain?: AnsarDomain;
    }) =>
      api
        .post<{ ok: boolean; firebase?: AdminFirebaseLink }>('/api/admin/accounts', input)
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    },
  });
}

/** Servant-only — the normal way to remove an Ansar's access: it revokes
 *  immediately (requireAdminAuth checks this row on every request), without
 *  deleting the underlying Firebase account. */
export function useSetAdminAccountActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/admin/accounts/${id}/active`, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    },
  });
}

/** Servant-only — reassigns an existing Ansar's operational area. Only ever
 *  valid for role:'ansar' rows; the backend rejects it for a Servant row. */
export function useSetAdminAccountDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ansarDomain }: { id: string; ansarDomain: AnsarDomain }) =>
      api.patch(`/api/admin/accounts/${id}/domain`, { ansarDomain }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    },
  });
}

/** Servant-only — emails an admin a link to set a new password. */
export function useSendAdminPasswordReset() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/accounts/${id}/password-reset`),
  });
}
