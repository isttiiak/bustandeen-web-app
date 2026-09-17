import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface SenderDiagnostics {
  configured: boolean;
  usingDedicated: boolean;
  resolvedUser: string | null;
}

export interface OpsHealth {
  emailSenders: Record<'sadaqah' | 'ansar' | 'istiak', SenderDiagnostics>;
  senderCollisions: { resolvedUser: string; senders: string[] }[];
  recentEmailFailures: {
    sender: string;
    to: string;
    subject: string;
    error: string;
    createdAt: string;
  }[];
  mongoConnected: boolean;
  firebaseInitialized: boolean;
}

export function useOpsHealth() {
  return useQuery<OpsHealth>({
    queryKey: ['admin', 'ops', 'health'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & OpsHealth>('/api/admin/ops/health');
      return res.data;
    },
    staleTime: 15_000,
  });
}

export interface RateLimitHitSummary {
  limiterName: string;
  path: string;
  count: number;
  lastHit: string;
}

export function useRateLimitHits() {
  return useQuery<RateLimitHitSummary[]>({
    queryKey: ['admin', 'ops', 'rate-limit-hits'],
    queryFn: async () => {
      const res = await api.get<{ hits: RateLimitHitSummary[] }>('/api/admin/ops/rate-limit-hits');
      return res.data.hits;
    },
    staleTime: 15_000,
  });
}
