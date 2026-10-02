import { useState } from 'react';
import { m as motion } from 'framer-motion';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore.js';
import api from '../lib/api.js';
import type { AuthUser } from '../types/api.js';

/**
 * For signed-in users who have no gender set (Google sign-up, legacy accounts):
 * shows a slim dismissible bar instead of a blocking full-screen overlay.
 * Gender selection now happens on the landing page for guests, so no guest banner here.
 */
export default function GenderGate() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(
    () => !!sessionStorage.getItem('bustandeen_gender_skipped')
  );

  if (!user || user.gender || skipped) return null;

  const save = async (gender: 'male' | 'female') => {
    setSaving(true);
    setError('');
    try {
      await api.patch('/api/user/me', { gender });
      const updated: AuthUser = { ...user, gender };
      localStorage.setItem('bustandeen_user', JSON.stringify(updated));
      setUser(updated);
    } catch {
      setError(t('genderGate.error', 'Something went wrong. Please try again.'));
      setSaving(false);
    }
  };

  const skip = () => {
    sessionStorage.setItem('bustandeen_gender_skipped', '1');
    setSkipped(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-brand-surface/80 backdrop-blur-sm border-b border-brand-border/40 px-4 py-3"
    >
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
        <p className="text-white/60 text-sm flex-1">
          {t('genderGate.bannerPrompt', 'Personalise your Bustandeen — tell us who you are:')}
        </p>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => void save('male')}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-brand-info/10 border border-brand-info/30 text-white/70 hover:bg-brand-info/20 hover:text-white transition-all disabled:opacity-50"
          >
            🧔 {t('genderGate.brother', 'Brother')}
          </button>
          <button
            onClick={() => void save('female')}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-brand-pink/10 border border-brand-pink/30 text-white/70 hover:bg-brand-pink/20 hover:text-white transition-all disabled:opacity-50"
          >
            🧕 {t('genderGate.sister', 'Sister')}
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/settings"
            onClick={skip}
            className="text-white/30 hover:text-white/50 text-xs transition-colors underline"
          >
            {t('nav.settings', 'Settings')}
          </Link>
          <button
            onClick={skip}
            className="text-white/30 hover:text-white/60 text-lg leading-none transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>

      {saving && (
        <div className="flex justify-center mt-1">
          <span className="loading loading-spinner loading-xs text-brand-emerald" />
        </div>
      )}
    </motion.div>
  );
}

/** Returns the active gender: authenticated user's gender, or the guest preference. */
export function getActiveGender(): 'male' | 'female' | undefined {
  const { user } = useAuthStore.getState();
  if (user?.gender === 'male' || user?.gender === 'female') return user.gender;
  return undefined;
}
