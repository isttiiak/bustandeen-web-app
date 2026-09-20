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
  audioAdded?: boolean;
  emailBody: string;
}

export interface ZikrRequestActionResult {
  request: ZikrRequest;
  /** False when the approval/rejection email failed to send (e.g. SMTP
   *  misconfigured), or when nothing was sent at all (no userEmail, or no
   *  emailBody for a reject) — that "nothing to send" case is `true` since
   *  nothing actually failed. The review decision itself still went
   *  through either way; this only flags a real, silent notification gap. */
  emailSent: boolean;
}

export function useApproveZikrRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ApproveZikrRequestInput & { id: string }) => {
      const res = await api.post<ZikrRequestActionResult>(
        `/api/admin/zikr-requests/${id}/approve`,
        input
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'zikr-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'library', 'global'] });
    },
  });
}

export function useRejectZikrRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      adminNote,
      emailBody,
    }: {
      id: string;
      adminNote?: string;
      emailBody?: string;
    }) => {
      const res = await api.post<ZikrRequestActionResult>(`/api/admin/zikr-requests/${id}/reject`, {
        adminNote,
        emailBody,
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'zikr-requests'] });
    },
  });
}

export interface GlobalLibraryItem {
  _id: string;
  name: string;
  arabic: string;
  transliteration?: string;
  meaning: string;
  source: string;
  sourceUrl: string;
  grade?: string;
  virtue?: string;
  category: GlobalZikrCategory;
  createdAt: string;
}

/** Servant-only full library list — for the "Manage library" edit/remove UI. */
export function useAdminZikrLibrary() {
  return useQuery<GlobalLibraryItem[]>({
    queryKey: ['admin', 'zikr-library'],
    queryFn: async () => {
      const res = await api.get<{ items: GlobalLibraryItem[] }>('/api/admin/zikr-requests/library');
      return res.data.items;
    },
    staleTime: 15_000,
  });
}

export interface LibraryItemEditInput {
  name?: string;
  arabic?: string;
  transliteration?: string;
  meaning?: string;
  source?: string;
  sourceUrl?: string;
  grade?: string;
  virtue?: string;
}

/** Servant-only — full-field edit of an already-published library item. */
export function useUpdateLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: LibraryItemEditInput & { id: string }) =>
      api.patch(`/api/admin/zikr-requests/library/${id}`, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'zikr-library'] });
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'library', 'global'] });
    },
  });
}

/** Servant-only — retire a duplicate/bad library entry. */
export function useDeleteLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/zikr-requests/library/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'zikr-library'] });
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'library', 'global'] });
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
