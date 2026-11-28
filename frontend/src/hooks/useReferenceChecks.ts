import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type { ManualCheck, ManualStatus } from '../data/references/referenceExport.js';

/** Manual checks on the reference map, keyed by reference id. */
export type ReferenceChecks = Record<string, ManualCheck>;

const PUBLIC_KEY = ['references', 'checks'] as const;
const ADMIN_KEY = ['admin', 'references', 'checks'] as const;

/** Public: the marks shown on /references. No account needed. */
export function useReferenceChecks() {
  return useQuery({
    queryKey: PUBLIC_KEY,
    queryFn: async () =>
      (await api.get<{ ok: boolean; checks: ReferenceChecks }>('/api/references/checks')).data
        .checks ?? {},
    staleTime: 60_000,
  });
}

/** Admin (Servant): the same marks, fetched fresh for editing. */
export function useAdminReferenceChecks() {
  return useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () =>
      (await api.get<{ ok: boolean; checks: ReferenceChecks }>('/api/admin/references/checks')).data
        .checks ?? {},
    staleTime: 15_000,
  });
}

export interface SaveReferenceCheck {
  refId: string;
  status: ManualStatus;
  by: string;
  date: string;
  note?: string;
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    void queryClient.invalidateQueries({ queryKey: PUBLIC_KEY });
  };
}

export function useSaveReferenceCheck() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: SaveReferenceCheck) =>
      (await api.put<{ ok: boolean; check: ManualCheck }>('/api/admin/references/checks', input))
        .data,
    onSuccess: refresh,
  });
}

export function useClearReferenceCheck() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (refId: string) =>
      (await api.delete(`/api/admin/references/checks/${encodeURIComponent(refId)}`)).data,
    onSuccess: refresh,
  });
}
