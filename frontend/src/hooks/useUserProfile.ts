import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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
  aiEnabled?: boolean;
  hijriOffset?: number;
  dayStartMode?: 'fajr' | 'midnight' | 'maghrib';
  totalCount?: number;
  createdAt?: string;
  primaryEmail?: string;
  linkedProviders?: Array<{ provider: string; email: string; providerUid: string }>;
}

/** The editable profile fields and the picture (Google photo URL or preset
 * avatar id; the server keeps those two mutually exclusive). */
export type ProfilePatch = Partial<
  Pick<
    DBUserProfile,
    | 'displayName'
    | 'firstName'
    | 'lastName'
    | 'photoUrl'
    | 'avatarId'
    | 'gender'
    | 'birthDate'
    | 'occupation'
    | 'bio'
    | 'city'
    | 'country'
    | 'aiEnabled'
    | 'hijriOffset'
    | 'dayStartMode'
  >
>;

const PROFILE_KEY = ['user', 'profile'] as const;

type UserReply = { ok: boolean; user?: DBUserProfile | null; error?: string };

/** The signed-in user's own record (`GET /api/user/me`, the `toClientUser`
 * shape). Pass `fresh` on a screen that edits it, so it never starts from a
 * copy cached on another screen. */
export function useUserProfile({ fresh = false }: { fresh?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  return useQuery<DBUserProfile | null>({
    queryKey: PROFILE_KEY,
    queryFn: async () => {
      const res = await api.get<UserReply>('/api/user/me');
      // The demo answers `{ ok: true }` with no user.
      return res.data.user ?? null;
    },
    enabled: !!user,
    // Profile data changes rarely: a 10-min stale time avoids redundant fetches
    // across page navigations; every mutation below writes the new copy.
    staleTime: 10 * 60_000,
    ...(fresh && { refetchOnMount: 'always' as const }),
  });
}

export function useInvalidateUserProfile() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PROFILE_KEY });
}

/** Shared by the account mutations: the reply's user replaces the cached copy.
 * A reply without one is an error, except in the demo (it answers every write
 * with a bare `{ ok: true }`, and there is nothing to save). */
function useUserMutation<V>(send: (vars: V) => Promise<UserReply>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V): Promise<DBUserProfile | null> => {
      const data = await send(vars);
      if (data.ok && !data.user && useAuthStore.getState().isDemoMode) return null;
      if (!data.ok || !data.user) throw new Error(data.error ?? 'No user in reply');
      return data.user;
    },
    onSuccess: (user) => {
      if (user) qc.setQueryData(PROFILE_KEY, user);
    },
  });
}

/** Saves profile fields and/or the picture. */
export function useUpdateProfile() {
  return useUserMutation((patch: ProfilePatch) =>
    api.patch<UserReply>('/api/user/me', patch).then((r) => r.data)
  );
}

/** Stores a Google account the user just linked in Firebase. */
export function useLinkGoogle() {
  return useUserMutation((vars: { googleEmail: string; googleUid: string }) =>
    api.post<UserReply>('/api/user/link-google', vars).then((r) => r.data)
  );
}

export function useUnlinkGoogle() {
  return useUserMutation((providerUid: string) =>
    api.post<UserReply>('/api/user/unlink-google', { providerUid }).then((r) => r.data)
  );
}

export function useSetPrimaryEmail() {
  return useUserMutation((email: string) =>
    api.patch<UserReply>('/api/user/primary-email', { email }).then((r) => r.data)
  );
}

/** What a failed account request said, for error copy: its HTTP status and
 * server message, or `offline` when no reply came back at all. */
export function requestError(err: unknown): {
  status?: number;
  message?: string;
  offline?: boolean;
} {
  if (!axios.isAxiosError(err)) return {};
  if (!err.response) return { offline: true };
  const data = err.response.data as { error?: string } | undefined;
  return { status: err.response.status, message: data?.error };
}
