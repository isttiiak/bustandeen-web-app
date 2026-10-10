import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface AdminOverviewStats {
  pendingSadaqah?: number;
  pendingZikrRequests?: number;
  openFeedback?: number;
  servant?: {
    totalVerifiedAmount: number;
    newUsersThisWeek: number;
    totalUsers: number;
    recentAuditLog: { actorEmail: string; action: string; createdAt: string }[];
    activity: {
      today: number;
      week: number;
      month: number;
      /** Newest first: [0] is the last 7 days. */
      signupsByWeek: number[];
      cameBack: { cohort: number; returned: number };
    };
  };
}

export function useAdminStats() {
  return useQuery<AdminOverviewStats>({
    queryKey: ['admin', 'stats', 'overview'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & AdminOverviewStats>('/api/admin/stats/overview');
      return res.data;
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}
