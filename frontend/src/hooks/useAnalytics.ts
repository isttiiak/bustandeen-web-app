import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '../lib/api.js';
import { getUserTimezoneOffset } from '../utils/timezone.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { placeClockOffsetMin } from '../utils/placeClock.js';
import { useAuthStore } from '../store/useAuthStore.js';
import type {
  AnalyticsResponse,
  ZikrGoal,
  ZikrStreak,
  ZikrTimeOfDayResponse,
  ZikrSessionsResponse,
} from '../types/api.js';

export function useAnalytics(days = 7) {
  const user = useAuthStore((s) => s.user);
  const timezoneOffset = getUserTimezoneOffset();
  const today = getTrackingDay();
  return useQuery<AnalyticsResponse>({
    queryKey: ['analytics', days, timezoneOffset, today],
    queryFn: async () => {
      const res = await api.get<AnalyticsResponse>('/api/analytics', {
        params: { days, timezoneOffset, today },
      });
      return res.data;
    },
    enabled: !!user,
    staleTime: 60_000, // analytics: 1-min staleness keeps charts responsive without flooding the API
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useZikrTimeOfDay(days = 30) {
  const user = useAuthStore((s) => s.user);
  // Hours on the saved place's clock (a far-zone phone saw them shifted)
  const timezoneOffset = placeClockOffsetMin();
  return useQuery({
    queryKey: ['zikr', 'time-of-day', days, timezoneOffset],
    queryFn: async () => {
      const res = await api.get<ZikrTimeOfDayResponse>('/api/zikr/time-of-day', {
        params: { days, timezoneOffset },
      });
      return res.data.hours;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useZikrSessions(dateStr: string) {
  const user = useAuthStore((s) => s.user);
  const timezoneOffset = getUserTimezoneOffset();
  return useQuery({
    queryKey: ['zikr', 'sessions', dateStr, timezoneOffset],
    queryFn: async () => {
      const res = await api.get<ZikrSessionsResponse>('/api/zikr/sessions', {
        params: { date: dateStr, timezoneOffset },
      });
      return res.data.sessions;
    },
    enabled: !!user && !!dateStr,
    staleTime: 30_000,
  });
}

export function useGoal() {
  const user = useAuthStore((s) => s.user);
  return useQuery<ZikrGoal>({
    queryKey: ['analytics', 'goal'],
    queryFn: async () => {
      const res = await api.get<{ goal: ZikrGoal }>('/api/analytics/goal');
      return res.data.goal;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useStreak() {
  const user = useAuthStore((s) => s.user);
  return useQuery<ZikrStreak>({
    queryKey: ['analytics', 'streak'],
    queryFn: async () => {
      const res = await api.get<{ streak: ZikrStreak }>('/api/analytics/streak', {
        params: { timezoneOffset: getUserTimezoneOffset(), today: getTrackingDay() },
      });
      return res.data.streak;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dailyTarget, graceDays }: { dailyTarget: number; graceDays?: number }) =>
      api.post('/api/analytics/goal', { dailyTarget, graceDays }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function usePauseStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post('/api/analytics/streak/pause', null, {
        params: { timezoneOffset: getUserTimezoneOffset(), today: getTrackingDay() },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'streak'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useResumeStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post('/api/analytics/streak/resume', null, {
        params: { timezoneOffset: getUserTimezoneOffset(), today: getTrackingDay() },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'streak'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
