import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';

export interface DBUserProfile {
  uid?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  avatarId?: string;
  gender?: string;
  birthDate?: string;
  occupation?: string;
  bio?: string;
  city?: string;
  country?: string;
  totalCount?: number;
  createdAt?: string;
  primaryEmail?: string;
  linkedProviders?: Array<{ provider: string; email: string; providerUid: string }>;
}

export function useUserProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery<DBUserProfile>({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; user: DBUserProfile }>('/api/user/me');
      return res.data.user;
    },
    enabled: !!user,
    // Profile data changes rarely — 10-min stale time avoids redundant fetches
    // across page navigations while still picking up updates after explicit saves.
    staleTime: 10 * 60_000,
  });
}

export function useInvalidateUserProfile() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['user', 'profile'] });
}
