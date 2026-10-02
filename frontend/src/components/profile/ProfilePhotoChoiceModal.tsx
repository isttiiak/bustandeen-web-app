import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CameraIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

export interface ProfilePhotoChoiceModalProps {
  applyGoogleAccountPhoto: () => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
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
  fileInputRef,
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
                  className="text-white/40 hover:text-white p-1 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setShowPhotoChoice(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-brand-deep border border-brand-border hover:border-brand-emerald/40 hover:bg-brand-emerald/5 text-white/70 hover:text-white transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-emerald/15 flex items-center justify-center shrink-0 group-hover:bg-brand-emerald/25 transition-colors">
                    <CameraIcon className="w-5 h-5 text-brand-emerald" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {t('profile.uploadPhoto', 'Upload Photo')}
                    </p>
                    <p className="text-white/30 text-xs">
                      {t('profile.fromDevice', 'From your device')}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowPhotoChoice(false);
                    setAvatarModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-brand-deep border border-brand-border hover:border-brand-warm/40 hover:bg-brand-warm/5 text-white/70 hover:text-white transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-warm/15 flex items-center justify-center shrink-0 group-hover:bg-brand-warm/25 transition-colors">
                    <PhotoIcon className="w-5 h-5 text-brand-warm" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {t('profile.chooseAvatar', 'Choose Avatar')}
                    </p>
                    <p className="text-white/30 text-xs">
                      {t('profile.themedIcons', 'Themed emoji icons')}
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
