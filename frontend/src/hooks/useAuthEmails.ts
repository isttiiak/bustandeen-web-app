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

export interface SignupStartInput {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'male' | 'female';
}

/** Email-first sign-up step 1: emails a link; no account is created yet.
 *  Same answer whether or not the email already has an account. */
export function useSignupStart() {
  return useMutation({
    mutationFn: async (input: SignupStartInput) => {
      await api.post('/api/auth/signup/start', { ...input, lang: emailLang() });
    },
  });
}

/** Whose sign-up a link finishes (the password page shows the email). A
 *  mutation, not a query, so the token never lands in the persisted cache. */
export function useSignupCheck() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post<{ email: string; firstName: string }>('/api/auth/signup/check', {
        token,
      });
      return res.data;
    },
  });
}

/** Step 2: creates the account (already verified) with the chosen password. */
export function useSignupComplete() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      const res = await api.post<{ email: string; gender: 'male' | 'female' }>(
        '/api/auth/signup/complete',
        input
      );
      return res.data;
    },
  });
}
