import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string;
}

export async function fetchActiveAnnouncement(): Promise<ActiveAnnouncement | null> {
  const res = await api.get<{ announcement?: ActiveAnnouncement | null }>(
    '/api/announcements/active'
  );
  // React Query rejects undefined; a missing field means no announcement.
  return res.data.announcement ?? null;
}

/** Public — no auth needed, safe for guests. */
export function useActiveAnnouncement() {
  return useQuery<ActiveAnnouncement | null>({
    queryKey: ['announcement', 'active'],
    queryFn: fetchActiveAnnouncement,
    staleTime: 5 * 60_000,
  });
}
