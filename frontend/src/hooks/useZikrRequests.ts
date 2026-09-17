import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export type ZikrRequestStatus = 'pending' | 'approved' | 'rejected';

export type GlobalZikrCategory =
  'tasbih' | 'istighfar' | 'salawat' | 'kalimat' | 'asma' | 'protection' | 'uncategorized';

/** Populated shape of a possible-duplicate match — only `_id`/`name` are
 * needed for the admin UI, which both GlobalZikrLibraryItem and ZikrRequest
 * (the two possible referenced models) have in common. */
export interface PossibleDuplicateRef {
  _id: string;
  name: string;
}

export interface ZikrRequest {
  _id: string;
  userId: string;
  userEmail?: string;
  name: string;
  arabic?: string;
  meaning?: string;
  source?: string;
  sourceUrl?: string;
  wantsAudio?: boolean;
  status: ZikrRequestStatus;
  adminNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  possibleDuplicateOf?: PossibleDuplicateRef | null;
  possibleDuplicateOfModel?: 'GlobalZikrLibraryItem' | 'ZikrRequest' | null;
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
  category: GlobalZikrCategory;
  createdAt: string;
}

export interface SubmitZikrRequestInput {
  name: string;
  arabic?: string;
  meaning?: string;
  source?: string;
  sourceUrl?: string;
  wantsAudio?: boolean;
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
