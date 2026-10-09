import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface SenderDiagnostics {
  configured: boolean;
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

export interface CollectionSize {
  name: string;
  documents: number;
  dataBytes: number;
  indexBytes: number;
  totalBytes: number;
}

export interface StorageUsage {
  collections: CollectionSize[];
  otherDatabases: { name: string; totalBytes: number }[];
  dataBytes: number;
  indexBytes: number;
  totalBytes: number;
  capBytes: number;
  usedRatio: number;
  warn: boolean;
}

export function useStorageUsage() {
  return useQuery<StorageUsage>({
    queryKey: ['admin', 'ops', 'storage'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & StorageUsage>('/api/admin/ops/storage');
      return res.data;
    },
    staleTime: 60_000,
  });
}

export interface CspViolationSummary {
  directive: string;
  blocked: string;
  source: string;
  disposition: string;
  count: number;
  days: number;
  lastSeen: string;
}

export interface CspViolationReport {
  sinceDay: string;
  daily: { day: string; count: number }[];
  top: CspViolationSummary[];
}

/** Daily CSP report counts, origins only (audit T1.3b). */
export function useCspViolations() {
  return useQuery<CspViolationReport>({
    queryKey: ['admin', 'ops', 'csp-violations'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & CspViolationReport>(
        '/api/admin/ops/csp-violations'
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}
