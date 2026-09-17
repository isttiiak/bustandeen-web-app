import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface ComposeEmailInput {
  to: string;
  subject: string;
  body: string;
}

export function useSendComposedEmail() {
  return useMutation({
    mutationFn: async (input: ComposeEmailInput) => {
      await api.post('/api/admin/compose-email/send', input);
    },
  });
}
