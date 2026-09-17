import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type { GlobalZikrCategory, ZikrRequest, ZikrRequestStatus } from './useZikrRequests.js';

export function useAdminZikrRequests(status?: ZikrRequestStatus) {
  return useQuery<ZikrRequest[]>({
    queryKey: ['admin', 'zikr-requests', status ?? 'all'],
    queryFn: async () => {
      const res = await api.get<{ requests: ZikrRequest[] }>('/api/admin/zikr-requests', {
        params: { status },
      });
      return res.data.requests;
    },
    staleTime: 15_000,
  });
}

/** On-demand fetch for the prefilled, editable email textarea — same pattern
 *  as the Sadaqah admin's verify/reject draft. */
export function useZikrRequestEmailDraft() {
  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'approved' | 'rejected' }) => {
      const res = await api.get<{ subject: string; body: string; isDuplicate: boolean }>(
        `/api/admin/zikr-requests/${id}/email-draft`,
        { params: { type } }
      );
      return res.data;
    },
  });
}

export interface ApproveZikrRequestInput {
  name: string;
  arabic: string;
  transliteration?: string;
  meaning: string;
  source: string;
  sourceUrl: string;
  grade?: string;
  virtue?: string;
  category?: GlobalZikrCategory;
  emailBody: string;
}

export function useApproveZikrRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ApproveZikrRequestInput & { id: string }) =>
      api.post(`/api/admin/zikr-requests/${id}/approve`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'zikr-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'library', 'global'] });
    },
  });
}

export function useRejectZikrRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      adminNote,
      emailBody,
    }: {
      id: string;
      adminNote?: string;
      emailBody?: string;
    }) => api.post(`/api/admin/zikr-requests/${id}/reject`, { adminNote, emailBody }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'zikr-requests'] });
    },
  });
}

/** Servant-only — re-categorize an already-published library item. */
export function useUpdateLibraryItemCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: GlobalZikrCategory }) =>
      api.patch(`/api/admin/zikr-requests/library/${id}/category`, { category }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'library', 'global'] });
    },
  });
}
