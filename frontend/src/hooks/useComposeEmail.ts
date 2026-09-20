import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface ComposeEmailInput {
  /** Threaded reply to an existing feedback/contact submission — `to` and
   *  `subject` are derived server-side, so omit them when this is set. */
  feedbackId?: string;
  to?: string;
  subject?: string;
  body: string;
}

export function useSendComposedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ComposeEmailInput) => {
      await api.post('/api/admin/compose-email/send', input);
    },
    onSuccess: (_data, variables) => {
      // A threaded reply flips that submission's status — keep the feedback
      // inbox list in sync if the founder has it open elsewhere.
      if (variables.feedbackId) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
      }
    },
  });
}
