import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type {
  Donation,
  DonationStatsResponse,
  DonationStatus,
  SadaqahExpense,
} from '../types/api.js';

export function usePendingDonations() {
  return useQuery<Donation[]>({
    queryKey: ['admin', 'sadaqah', 'pending'],
    queryFn: async () => {
      const res = await api.get<{ donations: Donation[] }>('/api/admin/sadaqah/pending');
      return res.data.donations;
    },
    staleTime: 15_000,
  });
}

interface AllDonationsResult {
  donations: Donation[];
  total: number;
  page: number;
  limit: number;
}

export function useAllDonations(status: DonationStatus | undefined, page: number, limit = 20) {
  return useQuery<AllDonationsResult>({
    queryKey: ['admin', 'sadaqah', 'all', status ?? 'any', page, limit],
    queryFn: async () => {
      const res = await api.get<AllDonationsResult>('/api/admin/sadaqah/all', {
        params: { status, page, limit },
      });
      return res.data;
    },
  });
}

/** On-demand fetch (not cached) for the prefilled, editable email text shown
 *  before a Verify/Reject actually sends — wrapped as a mutation since it's
 *  triggered imperatively by a button click, not rendered from cache. */
export function useEmailDraft() {
  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'verified' | 'rejected' }) => {
      const res = await api.get<{ subject: string; body: string }>(
        `/api/admin/sadaqah/${id}/email-draft`,
        { params: { type } }
      );
      return res.data;
    },
  });
}

export function useVerifyDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emailBody }: { id: string; emailBody: string }) =>
      api.patch(`/api/admin/sadaqah/${id}/verify`, { emailBody }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah'] });
      void queryClient.invalidateQueries({ queryKey: ['sadaqah', 'stats'] });
    },
  });
}

export function useRejectDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emailBody }: { id: string; emailBody: string }) =>
      api.patch(`/api/admin/sadaqah/${id}/reject`, { emailBody }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah'] });
    },
  });
}

/** Erroneous/test entries only — reverses the stats impact server-side if
 *  the donation had been verified. */
export function useDeleteDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/sadaqah/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah'] });
      void queryClient.invalidateQueries({ queryKey: ['sadaqah', 'stats'] });
    },
  });
}

export function useExpenses() {
  return useQuery<SadaqahExpense[]>({
    queryKey: ['admin', 'sadaqah', 'expenses'],
    queryFn: async () => {
      const res = await api.get<{ expenses: SadaqahExpense[] }>('/api/admin/sadaqah/expenses');
      return res.data.expenses;
    },
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: { date: string; amount: number; description: string }) =>
      api.post('/api/admin/sadaqah/expenses', expense),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah', 'expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/sadaqah/expenses/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah', 'expenses'] });
    },
  });
}

export interface AdminQuarterlyEntry {
  quarter: string;
  received: number;
  spent: number;
  notes: string;
  published: boolean;
}

/** Servant-only — every quarter including unpublished drafts, unlike the
 *  public /api/sadaqah/stats endpoint which only ever returns published
 *  ones. This is what the admin Analytics tab reads, not useSadaqahStats. */
export function useAdminQuarterlyList() {
  return useQuery<AdminQuarterlyEntry[]>({
    queryKey: ['admin', 'sadaqah', 'quarterly'],
    queryFn: async () => {
      const res = await api.get<{ quarterlyBreakdown: AdminQuarterlyEntry[] }>(
        '/api/admin/sadaqah/quarterly'
      );
      return res.data.quarterlyBreakdown;
    },
  });
}

/** Read-only, on-demand — never writes anything, just shows what a quarter
 *  WOULD publish as (computed fresh from verified donations + expenses). */
export function useQuarterlyPreview() {
  return useMutation({
    mutationFn: async (quarter: string) => {
      const res = await api.get<{ received: number; spent: number }>(
        `/api/admin/sadaqah/quarterly/${quarter}/preview`
      );
      return res.data;
    },
  });
}

/** Recomputes received/spent fresh every time — publishing an
 *  already-published quarter again is how you refresh its numbers or edit
 *  its notes, never a manually-typed amount. */
export function usePublishQuarterly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quarter, notes }: { quarter: string; notes?: string }) =>
      api.post<{ stats: DonationStatsResponse }>(
        `/api/admin/sadaqah/quarterly/${quarter}/publish`,
        { notes }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah', 'quarterly'] });
      void queryClient.invalidateQueries({ queryKey: ['sadaqah', 'stats'] });
    },
  });
}

/** Reversible — hides a quarter from the public page without discarding its
 *  stored notes/numbers, unlike useDeleteQuarterly below. */
export function useUnpublishQuarterly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quarter: string) => api.patch(`/api/admin/sadaqah/quarterly/${quarter}/unpublish`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah', 'quarterly'] });
      void queryClient.invalidateQueries({ queryKey: ['sadaqah', 'stats'] });
    },
  });
}

export function useDeleteQuarterly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quarter: string) => api.delete(`/api/admin/sadaqah/quarterly/${quarter}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sadaqah', 'quarterly'] });
      void queryClient.invalidateQueries({ queryKey: ['sadaqah', 'stats'] });
    },
  });
}

export interface DonorAnalytics {
  topDonors: { email: string; donationCount: number; totalAmount: number; isAppUser: boolean }[];
  repeatDonorCount: number;
  oneOffDonorCount: number;
  monthlyTrend: { month: string; amount: number; count: number }[];
}

/** Servant-only — cross-references verified donors against app User accounts.
 *  `enabled` defaults true but should be passed `isServant` by the caller so
 *  an Ansar's browser never even fires the request (it would just 403). */
export function useDonorAnalytics(enabled = true) {
  return useQuery<DonorAnalytics>({
    queryKey: ['admin', 'sadaqah', 'donor-analytics'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & DonorAnalytics>(
        '/api/admin/sadaqah/donor-analytics'
      );
      return res.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

/** Draft-then-confirm, same pattern as the donation verify/reject emails. */
export function useDonorEmailDraft() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.get<{ subject: string; body: string }>(
        '/api/admin/sadaqah/donor-email-draft',
        { params: { email } }
      );
      return res.data;
    },
  });
}

export function useSendDonorEmail() {
  return useMutation({
    mutationFn: (input: { email: string; subject: string; body: string }) =>
      api.post('/api/admin/sadaqah/donor-email-send', input),
  });
}
