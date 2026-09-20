import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface AdminAuditLogEntry {
  _id: string;
  actorEmail: string;
  actorRole: 'servant' | 'ansar';
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AdminAuditLogResult {
  entries: AdminAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

/** Servant-only trail of every mutating /api/admin/* action. */
export function useAdminAuditLog(actor: string, page: number, limit = 50) {
  return useQuery<AdminAuditLogResult>({
    queryKey: ['admin', 'audit-log', actor, page, limit],
    queryFn: async () => {
      const res = await api.get<AdminAuditLogResult>('/api/admin/audit-log', {
        params: { actor: actor || undefined, page, limit },
      });
      return res.data;
    },
    staleTime: 10_000,
  });
}
