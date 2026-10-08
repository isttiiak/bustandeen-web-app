import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { AVATARS, AvatarDisc } from '../icons/AvatarGlyphs.js';

export interface ProfileAvatarPickerProps {
  avatarModalOpen: boolean;
  selectAvatar: (id: string) => Promise<void>;
  selectedId: string | null;
  setAvatarModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uploading: boolean;
}

/** Portaled: the page sits in AnimatedBackground's `relative z-10`, under the navbar. */
export default function ProfileAvatarPicker({
  avatarModalOpen,
  selectAvatar,
  selectedId,
  setAvatarModalOpen,
  uploading,
}: ProfileAvatarPickerProps) {
  const { t } = useTranslation();
  return createPortal(
    <AnimatePresence>
      {avatarModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAvatarModalOpen(false);
          }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-avatar-title"
            className="bg-brand-deep rounded-card p-5 w-full max-w-sm shadow-elev-3 border border-brand-border space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="profile-avatar-title" className="font-display text-lg font-bold text-white">
                  {t('profile.chooseAvatar', 'Choose Avatar')}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {t('profile.natureIcons', 'Drawn icons, nothing to upload')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                aria-label={t('common.close', 'Close')}
                className="text-white/70 hover:text-white p-1 rounded-control transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((av) => {
                const label = t(`profile.avatar.${av.id}`, { defaultValue: av.label });
                const selected = selectedId === av.id;
                return (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => void selectAvatar(av.id)}
                    disabled={uploading}
                    aria-pressed={selected}
                    className="relative flex flex-col items-center gap-1 group disabled:opacity-50"
                    title={label}
                  >
                    <AvatarDisc
                      id={av.id}
                      className={`w-14 h-14 transition-shadow ring-offset-2 ring-offset-brand-deep ${
                        selected
                          ? 'ring-2 ring-brand-emerald'
                          : 'group-hover:ring-2 ring-brand-emerald/60'
                      }`}
                    />
                    {selected && (
                      <CheckIcon className="absolute top-0 right-1 w-4 h-4 p-0.5 rounded-full bg-brand-emerald-dim text-on-color" />
                    )}
                    <span className="text-white/80 text-[11px] leading-none group-hover:text-white transition-colors">
                      {label}
                    </span>
                  </button>
                );
              })}
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
    </AnimatePresence>,
    document.body
  );
}
