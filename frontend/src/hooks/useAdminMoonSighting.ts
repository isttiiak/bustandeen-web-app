import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

/** A national moon-sighting record as the Servant sees it (T4.1). */
export interface AdminMoonSighting {
  _id: string;
  country: string;
  effectiveFrom: string;
  offset: number;
  note: string;
  sourceUrl?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
}

export interface NewMoonSighting {
  country: string;
  effectiveFrom: string;
  offset: number;
  note: string;
  sourceUrl?: string;
}

const KEY = ['admin', 'moon-sighting'] as const;

export function useAdminMoonSighting() {
  return useQuery<AdminMoonSighting[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<{ records: AdminMoonSighting[] }>('/api/admin/moon-sighting');
      return res.data.records;
    },
    staleTime: 15_000,
  });
}

export function useCreateMoonSighting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewMoonSighting) => api.post('/api/admin/moon-sighting', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ['calendar', 'moon-sighting'] });
    },
  });
}

export function useDeactivateMoonSighting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/moon-sighting/${id}/deactivate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ['calendar', 'moon-sighting'] });
    },
  });
}
