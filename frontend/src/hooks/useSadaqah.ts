import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';
import type {
  DonationStatsResponse,
  SadaqahConfigResponse,
  SubmitDonationRequest,
} from '../types/api.js';

export function useSadaqahStats() {
  return useQuery<DonationStatsResponse>({
    queryKey: ['sadaqah', 'stats'],
    queryFn: async () => {
      const res = await api.get<DonationStatsResponse>('/api/sadaqah/stats');
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useSadaqahConfig() {
  return useQuery<SadaqahConfigResponse>({
    queryKey: ['sadaqah', 'config'],
    queryFn: async () => {
      const res = await api.get<SadaqahConfigResponse>('/api/sadaqah/config');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export interface ReceiptCheckResponse {
  ok: boolean;
  valid: boolean;
  receiptNo?: string;
  amount?: number;
  verifiedAt?: string;
}

/** Public check behind a receipt's QR code — needs no sign-in. */
export function useReceiptCheck(id: string | undefined, sig: string) {
  return useQuery<ReceiptCheckResponse>({
    queryKey: ['sadaqah', 'receipt-check', id, sig],
    enabled: !!id && !!sig,
    queryFn: async () => {
      const res = await api.get<ReceiptCheckResponse>(`/api/sadaqah/verify/${id}`, {
        params: { s: sig },
      });
      return res.data;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useSubmitDonation() {
  return useMutation({
    mutationFn: (payload: SubmitDonationRequest) =>
      api.post<{ ok: boolean; id: string; status: string }>('/api/sadaqah/submit', payload),
  });
}
