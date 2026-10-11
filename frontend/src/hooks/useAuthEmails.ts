import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';
import i18n from '../i18n.js';

// Account emails (forgot password, email verification) are sent by our server
// with a link to bustandeen.com/auth/action, not by Firebase's templates.

const emailLang = (): 'en' | 'bn' => (i18n.language?.startsWith('bn') ? 'bn' : 'en');

/** Always resolves for a well-formed email: the server never says whether
 *  an account exists. */
export function usePasswordResetEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post('/api/auth/password-reset', { email, lang: emailLang() });
    },
  });
}

/** The signed-in user's own verification email. */
export function useVerificationEmail() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/send-verification', { lang: emailLang() });
    },
  });
}
