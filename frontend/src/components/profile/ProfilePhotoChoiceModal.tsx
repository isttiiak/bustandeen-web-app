import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AvatarDisc } from '../icons/AvatarGlyphs.js';

export interface ProfilePhotoChoiceModalProps {
  applyGoogleAccountPhoto: () => Promise<void>;
  googleLinked: import('./profileParts.js').LinkedProvider | undefined;
  googlePhotoUrl: string | null;
  hasGoogle: boolean;
  setAvatarModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPhotoChoice: React.Dispatch<React.SetStateAction<boolean>>;
  showPhotoChoice: boolean;
  uploading: boolean;
}

export default function ProfilePhotoChoiceModal({
  applyGoogleAccountPhoto,
  googleLinked,
  googlePhotoUrl,
  hasGoogle,
  setAvatarModalOpen,
  setShowPhotoChoice,
  showPhotoChoice,
  uploading,
}: ProfilePhotoChoiceModalProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {showPhotoChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPhotoChoice(false);
            }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-brand-border"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {t('profile.changeProfilePhoto', 'Change Profile Photo')}
                  </h3>
                  <p className="text-white/30 text-xs mt-0.5">
                    {t('profile.howUpdate', 'How would you like to update?')}
                  </p>
                </div>
                <button
                  onClick={() => setShowPhotoChoice(false)}
                  aria-label={t('common.close', 'Close')}
                  className="text-white/60 hover:text-white p-1 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setShowPhotoChoice(false);
                    setAvatarModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-brand-deep border border-brand-border hover:border-brand-warm/40 hover:bg-brand-warm/5 text-white/70 hover:text-white transition-all text-left group"
                >
                  <AvatarDisc id="leaf" className="w-9 h-9 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {t('profile.chooseAvatar', 'Choose Avatar')}
                    </p>
                    <p className="text-white/30 text-xs">
                      {t('profile.themedIcons', 'Leaf, crescent, lantern and more')}
                    </p>
                  </div>
                </button>

                {hasGoogle && googlePhotoUrl && (
                  <button
                    onClick={() => void applyGoogleAccountPhoto()}
                    disabled={uploading}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-brand-deep border border-brand-border hover:border-brand-info/40 hover:bg-brand-info/5 text-white/70 hover:text-white transition-all text-left group disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-brand-border">
                      <img
                        src={googlePhotoUrl}
                        alt="Google"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {t('profile.useGooglePhoto', 'Use Google Account Photo')}
                      </p>
                      <p className="text-white/30 text-xs">{googleLinked?.email}</p>
                    </div>
                    {uploading && <span className="loading loading-spinner loading-xs ml-auto" />}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
