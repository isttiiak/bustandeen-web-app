import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';

/**
 * "Request your country's calendar" (Islamic calendar, 2026-10-16): sends only
 * the country code to the Feedback inbox as a "Calendar request". No name or
 * email; works signed out too.
 */
export function useCalendarRequest() {
  return useMutation({
    mutationFn: async ({ country, botcheck }: { country: string; botcheck: string }) => {
      const res = await api.post<{ ok: boolean }>('/api/feedback/calendar', {
        country,
        botcheck,
      });
      if (!res.data.ok) throw new Error('Failed');
    },
  });
}
