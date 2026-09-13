import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAdminStore } from '../store/useAdminStore.js';

export function useVerifyAdminPassword() {
  const setToken = useAdminStore((s) => s.setToken);
  return useMutation({
    mutationFn: async (password: string) => {
      const res = await api.post<{ token: string }>('/api/admin/auth/verify-password', {
        password,
      });
      return res.data.token;
    },
    onSuccess: (token) => setToken(token),
  });
}
