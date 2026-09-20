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

export function useMarkRepliedExternal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<{ message: AdminFeedbackMessage }>(
        `/api/admin/feedback/${id}/mark-replied-external`
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

// ---- Founder mailbox (Servant-only; istiak@bustandeen.com via IMAP sync) ----

export interface MailboxSyncStatus {
  /** Master switch (server env MAILBOX_SYNC_ENABLED). Off = paused, no Zoho calls. */
  enabled: boolean;
  configured: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface AdminMailboxMessage {
  _id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  text: string;
  receivedAt: string;
  status: FeedbackStatus;
  feedbackId: string | null;
  repliedAt?: string | null;
  repliedBy?: string | null;
}

interface MailboxListResult {
  messages: AdminMailboxMessage[];
  total: number;
  page: number;
  limit: number;
  sync: MailboxSyncStatus;
}

const MAILBOX_KEY = ['admin', 'mailbox'] as const;

export function useAdminMailbox(status: FeedbackStatus | 'all', enabled: boolean) {
  return useQuery<MailboxListResult>({
    queryKey: [...MAILBOX_KEY, 'list', status],
    queryFn: async () => {
      const res = await api.get<MailboxListResult>('/api/admin/feedback/mailbox', {
        params: { status: status === 'all' ? undefined : status, limit: 50 },
      });
      return res.data;
    },
    enabled,
    staleTime: 10_000,
  });
}

/** Pulls new mail from the real mailbox; refreshes the list when done. */
export function useSyncMailbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ ok: boolean; added: number; error?: string }>(
        '/api/admin/feedback/mailbox/sync'
      );
      return res.data;
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: MAILBOX_KEY }),
  });
}

const useMailboxAction = <V>(run: (v: V) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: MAILBOX_KEY }),
  });
};

export const useReplyMailbox = () =>
  useMailboxAction(({ id, body }: { id: string; body: string }) =>
    api.post(`/api/admin/feedback/mailbox/${id}/reply`, { body })
  );
export const useMarkMailboxRepliedExternal = () =>
  useMailboxAction((id: string) =>
    api.patch(`/api/admin/feedback/mailbox/${id}/mark-replied-external`)
  );
export const useArchiveMailbox = () =>
  useMailboxAction((id: string) => api.patch(`/api/admin/feedback/mailbox/${id}/archive`));
export const useDeleteMailbox = () =>
  useMailboxAction((id: string) => api.delete(`/api/admin/feedback/mailbox/${id}`));
