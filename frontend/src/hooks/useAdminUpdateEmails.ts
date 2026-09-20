import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export type UpdateAudience = 'brother' | 'sister' | 'all' | 'custom';
export type NotSetMode = 'include' | 'skip' | 'selected';

export interface UpdateEmailAudience {
  brothers: number;
  sisters: number;
  notSet: number;
  notSetUsers: Array<{ uid: string; email: string; name: string }>;
  notSetListTruncated: boolean;
  trailer: string;
  sender: string;
}

export interface UpdateEmailCampaignSummary {
  _id: string;
  subject: string;
  audience: UpdateAudience;
  notSetMode?: NotSetMode;
  createdBy: string;
  createdAt: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface UpdateEmailRecipient {
  uid: string;
  email: string;
  name: string;
  group: 'male' | 'female' | 'unset' | 'custom';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

const AUDIENCE_KEY = ['admin', 'update-emails', 'audience'] as const;
const LIST_KEY = ['admin', 'update-emails', 'list'] as const;

export function useUpdateEmailAudience() {
  return useQuery<UpdateEmailAudience>({
    queryKey: AUDIENCE_KEY,
    queryFn: async () =>
      (await api.get<UpdateEmailAudience>('/api/admin/update-emails/audience')).data,
    staleTime: 30_000,
  });
}

export function useUpdateEmailCampaigns() {
  return useQuery<UpdateEmailCampaignSummary[]>({
    queryKey: LIST_KEY,
    queryFn: async () =>
      (await api.get<{ campaigns: UpdateEmailCampaignSummary[] }>('/api/admin/update-emails')).data
        .campaigns,
    staleTime: 10_000,
  });
}

export function useUpdateEmailCampaign(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'update-emails', 'one', id],
    enabled: !!id,
    queryFn: async () =>
      (
        await api.get<{
          summary: UpdateEmailCampaignSummary;
          body: string;
          recipients: UpdateEmailRecipient[];
        }>(`/api/admin/update-emails/${id}`)
      ).data,
  });
}

export interface SendUpdateInput {
  subject: string;
  body: string;
  /** Group selection... */
  audience?: Exclude<UpdateAudience, 'custom'>;
  notSetMode?: NotSetMode;
  selectedUids?: string[];
  /** ...or custom addresses (used instead of any group). */
  customEmails?: string[];
}

type CampaignResponse = { campaign: UpdateEmailCampaignSummary };

/** Creates the campaign (first chunk goes out with it), then keeps asking the
 * server for the next chunk until nothing is pending. Progress is reported so
 * the page can show "sent 40 of 130". */
export function useSendUpdateEmail(onProgress?: (c: UpdateEmailCampaignSummary) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendUpdateInput) => {
      let { campaign } = (await api.post<CampaignResponse>('/api/admin/update-emails', input)).data;
      onProgress?.(campaign);
      while (campaign.pending > 0) {
        campaign = (
          await api.post<CampaignResponse>(`/api/admin/update-emails/${campaign._id}/continue`)
        ).data.campaign;
        onProgress?.(campaign);
      }
      return campaign;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['admin', 'update-emails'] }),
  });
}

export function useRetryFailedUpdateEmail(onProgress?: (c: UpdateEmailCampaignSummary) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      let { campaign } = (
        await api.post<CampaignResponse>(`/api/admin/update-emails/${id}/retry-failed`)
      ).data;
      while (campaign.pending > 0) {
        campaign = (await api.post<CampaignResponse>(`/api/admin/update-emails/${id}/continue`))
          .data.campaign;
        onProgress?.(campaign);
      }
      return campaign;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['admin', 'update-emails'] }),
  });
}
