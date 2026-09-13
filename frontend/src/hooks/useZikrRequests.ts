import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export type ZikrRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ZikrRequest {
  _id: string;
  userId: string;
  userEmail?: string;
  name: string;
  arabic?: string;
  meaning: string;
  source?: string;
  sourceUrl?: string;
  status: ZikrRequestStatus;
  adminNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  userAcknowledged: boolean;
  createdAt: string;
}

export interface GlobalZikrLibraryItem {
  _id: string;
  name: string;
  arabic: string;
  transliteration?: string;
  meaning: string;
  source: string;
  sourceUrl: string;
  grade?: string;
  virtue?: string;
  createdAt: string;
}

export interface SubmitZikrRequestInput {
  name: string;
  arabic?: string;
  meaning: string;
  source?: string;
  sourceUrl?: string;
}

export function useSubmitZikrRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitZikrRequestInput) => {
      const res = await api.post<{ request: ZikrRequest }>('/api/zikr/requests', input);
      return res.data.request;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'requests', 'mine'] });
    },
  });
}

/** Polled at a normal query interval (not on every page) — used to surface
 * the one-time "we added it" notice for an approved request the user hasn't
 * dismissed yet. */
export function useMyZikrRequests() {
  return useQuery<ZikrRequest[]>({
    queryKey: ['zikr', 'requests', 'mine'],
    queryFn: async () => {
      const res = await api.get<{ requests: ZikrRequest[] }>('/api/zikr/requests/mine');
      return res.data.requests;
    },
    staleTime: 60_000,
  });
}

export function useAckZikrRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/zikr/requests/${id}/ack`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['zikr', 'requests', 'mine'] });
    },
  });
}

/** Admin-approved suggestions merged into the curated ZIKR_LIBRARY display —
 * public, no auth needed. */
export function useGlobalZikrLibrary() {
  return useQuery<GlobalZikrLibraryItem[]>({
    queryKey: ['zikr', 'library', 'global'],
    queryFn: async () => {
      const res = await api.get<{ items: GlobalZikrLibraryItem[] }>('/api/zikr/library');
      return res.data.items;
    },
    staleTime: 5 * 60_000,
  });
}
