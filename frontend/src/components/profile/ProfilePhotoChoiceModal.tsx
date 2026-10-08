import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AvatarDisc } from '../icons/AvatarGlyphs.js';
import { ITEM } from '../bustanStyles.js';

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

/** Portaled: the page sits in AnimatedBackground's `relative z-10`, under the navbar. */
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
  return createPortal(
    <AnimatePresence>
      {showPhotoChoice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhotoChoice(false);
          }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-choice-title"
            className="bg-brand-deep rounded-card p-5 w-full max-w-xs shadow-elev-3 border border-brand-border"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3
                  id="profile-photo-choice-title"
                  className="font-display text-lg font-bold text-white"
                >
                  {t('profile.changeProfilePhoto', 'Change Profile Photo')}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {t('profile.howUpdate', 'How would you like to update?')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoChoice(false)}
                aria-label={t('common.close', 'Close')}
                className="text-white/70 hover:text-white p-1 rounded-control transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPhotoChoice(false);
                  setAvatarModalOpen(true);
                }}
                className={`${ITEM} w-full flex items-center gap-3 text-white`}
              >
                <AvatarDisc id="leaf" className="w-10 h-10 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t('profile.chooseAvatar', 'Choose Avatar')}
                  </p>
                  <p className="text-white/70 text-xs">
                    {t('profile.themedIcons', 'Leaf, crescent, lantern and more')}
                  </p>
                </div>
              </button>

              {hasGoogle && googlePhotoUrl && (
                <button
                  type="button"
                  onClick={() => void applyGoogleAccountPhoto()}
                  disabled={uploading}
                  className={`${ITEM} w-full flex items-center gap-3 text-white disabled:opacity-50`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-brand-border">
                    <img src={googlePhotoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {t('profile.useGooglePhoto', 'Use Google Account Photo')}
                    </p>
                    <p className="text-white/70 text-xs truncate">{googleLinked?.email}</p>
                  </div>
                  {uploading && <span className="loading loading-spinner loading-xs ml-auto" />}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
