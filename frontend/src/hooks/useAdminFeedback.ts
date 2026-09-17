import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export type FeedbackKind = 'feedback' | 'contact';
export type FeedbackStatus = 'open' | 'replied' | 'archived';

export interface AdminFeedbackMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  category: string[];
  kind: FeedbackKind;
  userId: string | null;
  status: FeedbackStatus;
  adminNote?: string | null;
  repliedAt?: string | null;
  repliedBy?: string | null;
  createdAt: string;
}

interface FeedbackListResult {
  messages: AdminFeedbackMessage[];
  total: number;
  page: number;
  limit: number;
}

const KEY = ['admin', 'feedback'] as const;

export function useAdminFeedback(status: FeedbackStatus | 'all', page: number, limit = 25) {
  return useQuery<FeedbackListResult>({
    queryKey: [...KEY, 'list', status, page, limit],
    queryFn: async () => {
      const res = await api.get<FeedbackListResult>('/api/admin/feedback', {
        params: { status: status === 'all' ? undefined : status, page, limit },
      });
      return res.data;
    },
    staleTime: 10_000,
  });
}

export function useReplyFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const res = await api.post<{ message: AdminFeedbackMessage }>(
        `/api/admin/feedback/${id}/reply`,
        { body }
      );
      return res.data.message;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useArchiveFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<{ message: AdminFeedbackMessage }>(
        `/api/admin/feedback/${id}/archive`
      );
      return res.data.message;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/feedback/${id}`);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
