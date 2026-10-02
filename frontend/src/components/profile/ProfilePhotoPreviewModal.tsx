import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';

export interface ProfilePhotoPreviewModalProps {
  cancelPhotoModal: () => void;
  photoModalOpen: boolean;
  photoPreviewUrl: string;
  uploadPhoto: () => Promise<void>;
  uploading: boolean;
}

export default function ProfilePhotoPreviewModal({
  cancelPhotoModal,
  photoModalOpen,
  photoPreviewUrl,
  uploadPhoto,
  uploading,
}: ProfilePhotoPreviewModalProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {photoModalOpen && (
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
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border text-center space-y-4"
            >
              <h3 className="text-lg font-black text-white">
                {t('profile.uploadProfilePhoto', 'Upload Profile Photo')}
              </h3>

              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-brand-emerald/40">
                  <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>

              <p className="text-white/30 text-xs leading-relaxed px-2">
                {t(
                  'profile.compressedNote',
                  'Compressed to 400px JPEG. Stored in Firebase Storage.'
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelPhotoModal}
                  disabled={uploading}
                  className="btn flex-1 btn-ghost text-white/60 border-brand-border disabled:opacity-40"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="btn flex-1 bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-white border-0 font-bold"
                >
                  {uploading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    t('profile.useThisPhoto', 'Use This Photo')
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
