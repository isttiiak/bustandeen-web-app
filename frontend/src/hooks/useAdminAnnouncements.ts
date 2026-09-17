import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface AdminAnnouncement {
  _id: string;
  title: string;
  body: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt?: string | null;
}

const KEY = ['admin', 'announcements'] as const;

export function useAdminAnnouncements() {
  return useQuery<AdminAnnouncement[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<{ announcements: AdminAnnouncement[] }>('/api/admin/announcements');
      return res.data.announcements;
    },
    staleTime: 15_000,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body: string; expiresAt?: string }) =>
      api.post('/api/admin/announcements', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/announcements/${id}/deactivate`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
