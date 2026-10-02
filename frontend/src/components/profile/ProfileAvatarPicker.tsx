import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PRESET_AVATARS } from './profileParts.js';

export interface ProfileAvatarPickerProps {
  avatarModalOpen: boolean;
  selectAvatar: (av: { emoji: string; bg: string }) => Promise<void>;
  setAvatarModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uploading: boolean;
}

export default function ProfileAvatarPicker({
  avatarModalOpen,
  selectAvatar,
  setAvatarModalOpen,
  uploading,
}: ProfileAvatarPickerProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {avatarModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {t('profile.chooseAvatar', 'Choose Avatar')}
                  </h3>
                  <p className="text-white/30 text-xs mt-0.5">
                    {t('profile.natureIcons', 'Nature-themed icons — no upload required')}
                  </p>
                </div>
                <button
                  onClick={() => setAvatarModalOpen(false)}
                  className="text-white/40 hover:text-white transition-colors p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => void selectAvatar(av)}
                    disabled={uploading}
                    className="flex flex-col items-center gap-1 group disabled:opacity-50"
                    title={t(`profile.avatar.${av.id}`, av.label)}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all group-hover:scale-110 group-hover:ring-2 ring-brand-emerald/60 ring-offset-2 ring-offset-brand-surface shadow-md"
                      style={{ backgroundColor: av.bg }}
                    >
                      {av.emoji}
                    </div>
                    <span className="text-white/30 text-[9px] leading-none group-hover:text-white/60 transition-colors">
                      {t(`profile.avatar.${av.id}`, av.label)}
                    </span>
                  </button>
                ))}
              </div>
              {uploading && (
                <div className="flex items-center justify-center gap-2 text-brand-emerald text-sm">
                  <span className="loading loading-spinner loading-sm" />{' '}
                  {t('profile.saving', 'Saving…')}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
