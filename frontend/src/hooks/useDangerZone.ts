import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';

export interface DangerAction {
  method: 'delete' | 'post' | 'patch';
  endpoint: string;
  body?: Record<string, unknown>;
}

/** Runs one Settings danger-zone action (reset a tracker, delete all of one kind
 * of data) against its endpoint. The screen asks twice before calling it and
 * refreshes its queries afterwards. */
export function useDangerAction() {
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ method, endpoint, body }: DangerAction): Promise<void> => {
      if (method === 'delete') await api.delete(endpoint);
      else if (method === 'post') await api.post(endpoint, body ?? {});
      else await api.patch(endpoint, body ?? {});
    },
  });
}
