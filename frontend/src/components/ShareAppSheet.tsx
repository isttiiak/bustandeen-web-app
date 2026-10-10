import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from './bustanStyles.js';

/** Always the public site, never an invite link: sharing the app makes no
 * friend connection (U2). */
export const SHARE_APP_URL = 'https://bustandeen.com';
/** Same-origin copy of the site's OG card: no third-party request. */
const OG_IMAGE = '/og-image.jpg';

/** The invitation text, with or without the sharer's name. */
export function shareAppMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  name: string | null
): string {
  return name
    ? t('shareApp.messageNamed', { name, link: SHARE_APP_URL })
    : t('shareApp.message', { link: SHARE_APP_URL });
}

/**
 * "Share Bustandeen" (profile menu): a preview of the card and the message,
 * an opt-in "add my name" (off by default), then the system share sheet with
 * the image (like the photo cards) or Copy.
 */
export default function ShareAppSheet({
  displayName,
  onClose,
}: {
  /** null when there is no name to add (demo, no display name) */
  displayName: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [withName, setWithName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = shareAppMessage(t, withName && displayName ? displayName : null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success(t('shareApp.copied'), { id: 'share-app-copy' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('friends.copyError'));
    }
  };

  const shareViaApps = async () => {
    setBusy(true);
    try {
      let file: File | null = null;
      try {
        const blob = await (await fetch(OG_IMAGE)).blob();
        file = new File([blob], 'bustandeen.jpg', { type: blob.type || 'image/jpeg' });
      } catch {
        file = null; // offline and not cached: share the text alone
      }
      if (file && navigator.canShare?.({ files: [file], text: message })) {
        await navigator.share({ files: [file], text: message });
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ text: message });
      } else {
        await copy();
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') toast.error(t('shareApp.shareError'));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-app-title"
        className="bg-brand-deep rounded-card p-5 w-full max-w-md shadow-elev-3 border border-brand-border space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="share-app-title"
              className="font-display text-lg font-bold text-white leading-tight"
            >
              {t('shareApp.title')}
            </h3>
            <p className="text-white/70 text-xs mt-0.5">{t('shareApp.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-white/70 hover:text-white p-1 rounded-control transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <img
          src={OG_IMAGE}
          alt={t('shareApp.imageAlt')}
          width={1200}
          height={630}
          className="w-full h-auto rounded-control border border-brand-border"
        />

        <p className="rounded-control border border-brand-border bg-shade/20 px-3 py-2.5 text-sm text-white/85 leading-relaxed whitespace-pre-line break-words">
          {message}
        </p>

        {displayName && (
          <label className="flex items-center justify-between gap-3 rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2.5 cursor-pointer">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">{t('shareApp.addName')}</span>
              <span className="block text-xs text-white/70">{t('shareApp.addNameDesc')}</span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-success shrink-0"
              checked={withName}
              onChange={(e) => setWithName(e.target.checked)}
            />
          </label>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => void copy()} className={`${BTN_SECONDARY} shrink-0`}>
            {copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <ClipboardDocumentIcon className="w-4 h-4" />
            )}
            {copied ? t('friends.copied') : t('friends.copy')}
          </button>
          <button
            type="button"
            onClick={() => void shareViaApps()}
            disabled={busy}
            className={`${BTN_PRIMARY} flex-1 whitespace-nowrap`}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <ShareIcon className="w-4 h-4" />
            )}
            {t('shareApp.shareVia')}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
