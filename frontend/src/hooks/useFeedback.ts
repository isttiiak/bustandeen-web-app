import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface FeedbackPayload {
  name: string;
  email: string;
  message: string;
  category: Array<string | undefined>;
  kind: string;
  /** Honeypot: a person leaves it empty. */
  botcheck: string;
}

/** Sends the Feedback / Zikr-request form (`POST /api/feedback`). A reply with
 * `ok: false` is an error. Tries even when the browser says it is offline, so the
 * form can show its own "could not send" message at once. */
export function useSendFeedback() {
  return useMutation({
    networkMode: 'always',
    mutationFn: async (payload: FeedbackPayload): Promise<void> => {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/feedback', payload);
      if (!res.data.ok) throw new Error(res.data.error ?? 'Failed');
    },
  });
}
