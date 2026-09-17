import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string;
}

/** Public — no auth needed, safe for guests. */
export function useActiveAnnouncement() {
  return useQuery<ActiveAnnouncement | null>({
    queryKey: ['announcement', 'active'],
    queryFn: async () => {
      const res = await api.get<{ announcement: ActiveAnnouncement | null }>(
        '/api/announcements/active'
      );
      return res.data.announcement;
    },
    staleTime: 5 * 60_000,
  });
}
