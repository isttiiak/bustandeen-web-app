import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getUserTimezoneOffset } from '../utils/timezone.js';
import { getTrackingDay } from '../utils/trackingDay.js';

export interface FriendStats {
  uid: string;
  displayName: string;
  photoUrl?: string;
  /** Full country name from the user's profile (e.g. "Bangladesh") */
  country?: string;
  isMe: boolean;
  salatToday: number;
  /** How many fard prayer windows have opened so far today (0–5) */
  prayersDue?: number;
  zikrStreak: number;
  zikrState: 'active' | 'grace' | 'none' | 'paused';
  zikrToday: number;
  zikrGoal: number;
  zikrGoalMet: boolean;
  fastsThisMonth: number;
  fastedToday: boolean;
  quranStreak: number;
  quranPagesToday: number;
  quranGoal: number;
  score: number;
  /** Average daily Noor this Friday-to-Thursday week so far */
  weekScore?: number;
  /** The friend's usual daily Noor (average of recent active days); null while there is too little history */
  usualScore?: number | null;
  /** Distinct good acts today (leaderboard tie-break) */
  actsToday?: number;
  /** Present ONLY for the one friend who has opted in to share her cycle
   * status with you specifically — see Rayhanah's partner-sync setting. */
  onCycle?: boolean;
}

export interface SocialSummary {
  inviteCode: string;
  leaderboard: FriendStats[];
  /** Whether the viewer has opted out of appearing on others' leaderboards */
  invisible: boolean;
  /** Count of incoming friend requests awaiting the viewer's accept/reject */
  pendingCount: number;
}

function localTodayStr(): string {
  return getTrackingDay();
}

export function useSocialSummary() {
  const user = useAuthStore((s) => s.user);
  const today = localTodayStr();
  return useQuery({
    queryKey: ['social', 'summary', today],
    queryFn: async () => {
      const { data } = await api.get<SocialSummary & { ok: boolean }>(
        `/api/social/summary?today=${today}&timezoneOffset=${getUserTimezoneOffset()}`
      );
      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
    // Entering the Friends page must always show the user's LATEST stats —
    // they may have just prayed/counted zikr elsewhere in the app. Cached
    // data still paints instantly; this refetches in the background.
    refetchOnMount: 'always',
  });
}

export interface NoorResult {
  today: number;
  allTime: number;
}

/** Viewer's Noor for the navbar capsules — light endpoint, cached 5 min */
export function useNoor(enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  const today = localTodayStr();
  return useQuery({
    queryKey: ['social', 'noor', today],
    queryFn: async () => {
      const { data } = await api.get<NoorResult & { ok: boolean }>(
        `/api/social/noor?today=${today}&timezoneOffset=${getUserTimezoneOffset()}`
      );
      return data;
    },
    enabled: !!user && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useConnectFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<{
        ok: boolean;
        message: string;
        friendName?: string;
        pending?: boolean;
      }>('/api/social/connect', { code });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useUnfriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendUid: string) => {
      await api.delete(`/api/social/friends/${friendUid}`);
      return friendUid;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['social'] });
    },
    onError: () => toast.error('Could not remove friend — try again.', { id: 'social-unfriend' }),
  });
}

export interface FriendListItem {
  uid: string;
  displayName: string;
  photoUrl?: string;
  connectedSince: string | null;
}

/** Full friend list with join dates — for the "See friends" manage view. */
export function useFriendsList(enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['social', 'friends'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; friends: FriendListItem[] }>(
        '/api/social/friends'
      );
      return data.friends;
    },
    enabled: !!user && enabled,
    staleTime: 60_000,
  });
}

export interface PendingRequestItem {
  uid: string;
  displayName: string;
  photoUrl?: string;
}

/** Incoming friend requests awaiting accept/reject — people who opened my invite link. */
export function usePendingRequests(enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['social', 'requests'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; requests: PendingRequestItem[] }>(
        '/api/social/requests'
      );
      return data.requests;
    },
    enabled: !!user && enabled,
    staleTime: 30_000,
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requesterUid: string) => {
      const { data } = await api.post<{ ok: boolean; message: string; friendName?: string }>(
        `/api/social/requests/${requesterUid}/accept`
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social'] }),
    onError: () =>
      toast.error('Could not accept the request — try again.', { id: 'social-accept' }),
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requesterUid: string) => {
      await api.post(`/api/social/requests/${requesterUid}/reject`);
      return requesterUid;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social', 'requests'] }),
    onError: () =>
      toast.error('Could not reject the request — try again.', { id: 'social-reject' }),
  });
}

/** Uids I've blocked — for the "Manage blocked" view. */
export function useBlockedList(enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['social', 'blocked'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; blocked: PendingRequestItem[] }>(
        '/api/social/blocked'
      );
      return data.blocked;
    },
    enabled: !!user && enabled,
    staleTime: 60_000,
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUid: string) => {
      await api.post(`/api/social/block/${targetUid}`);
      return targetUid;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social'] }),
    onError: () => toast.error('Could not block this user — try again.', { id: 'social-block' }),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUid: string) => {
      await api.delete(`/api/social/block/${targetUid}`);
      return targetUid;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social', 'blocked'] }),
    onError: () =>
      toast.error('Could not unblock this user — try again.', { id: 'social-unblock' }),
  });
}

/** Full leaderboard opt-out — when on, no one (not even existing friends) sees your stats. */
export function useSetInvisible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invisible: boolean) => {
      const { data } = await api.patch<{ ok: boolean; invisible: boolean }>(
        '/api/social/invisible',
        { invisible }
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social'] }),
    onError: () =>
      toast.error('Could not update your privacy setting — try again.', { id: 'social-invisible' }),
  });
}
