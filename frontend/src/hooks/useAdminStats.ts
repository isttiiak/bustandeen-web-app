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

export interface DailyActivityPoint {
  day: string;
  /** People who opened the app; null before counting started. */
  active: number | null;
  salat: number;
  zikr: number;
  quran: number;
  fasting: number;
}

export interface DailyActivitySeries {
  days: DailyActivityPoint[];
  activeSince: string | null;
}

/** Servant only: day-by-day counts for the last 90 days (T4.6). */
export function useDailyActivity(enabled: boolean) {
  return useQuery<DailyActivitySeries>({
    queryKey: ['admin', 'stats', 'daily'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & DailyActivitySeries>('/api/admin/stats/daily');
      return res.data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
