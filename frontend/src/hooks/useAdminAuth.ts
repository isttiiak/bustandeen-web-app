import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAdminStore } from '../store/useAdminStore.js';

interface AdminLoginResponse {
  token: string;
  email: string;
  isOwner: boolean;
  expiresIn: number;
}

/**
 * The admin panel's entire login — no Firebase account of any kind involved.
 * See adminAuth.controller.ts's loginHandler.
 */
export function useAdminLogin() {
  const login = useAdminStore((s) => s.login);
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await api.post<AdminLoginResponse>('/api/admin/auth/login', creds);
      return res.data;
    },
    onSuccess: (data) => login(data.token, data.email, data.isOwner),
  });
}
