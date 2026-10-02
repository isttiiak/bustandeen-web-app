import React from 'react';
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

export default function ProfileAvatarPicker({
  avatarModalOpen,
  selectAvatar,
  selectedId,
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
              className="bg-brand-surface rounded-card p-6 w-full max-w-sm shadow-elev-3 border border-brand-border space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {t('profile.chooseAvatar', 'Choose Avatar')}
                  </h3>
                  <p className="text-white/30 text-xs mt-0.5">
                    {t('profile.natureIcons', 'Drawn icons, nothing to upload')}
                  </p>
                </div>
                <button
                  onClick={() => setAvatarModalOpen(false)}
                  aria-label={t('common.close', 'Close')}
                  className="text-white/60 hover:text-white transition-colors p-1"
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
                      key={av.id}
                      onClick={() => void selectAvatar(av.id)}
                      disabled={uploading}
                      aria-pressed={selected}
                      className="relative flex flex-col items-center gap-1 group disabled:opacity-50"
                      title={label}
                    >
                      <AvatarDisc
                        id={av.id}
                        className={`w-14 h-14 transition-shadow ring-offset-2 ring-offset-brand-surface ${
                          selected
                            ? 'ring-2 ring-brand-emerald'
                            : 'group-hover:ring-2 ring-brand-emerald/60'
                        }`}
                      />
                      {selected && (
                        <CheckIcon className="absolute top-0 right-1 w-4 h-4 p-0.5 rounded-full bg-brand-emerald-dim text-on-color" />
                      )}
                      <span className="text-white/60 text-[10px] leading-none group-hover:text-white transition-colors">
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
      </AnimatePresence>
    </>
  );
}
