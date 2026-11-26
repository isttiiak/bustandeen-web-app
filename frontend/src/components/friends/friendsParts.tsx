import type React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { UserAvatar } from '../icons/AvatarGlyphs.js';

export type SvgIcon = (p: { className?: string }) => React.ReactNode;

/** A row inside a card or dialog. */
export const ROW = 'rounded-control border border-brand-border bg-brand-surface/50 p-3';
/** A chosen / not chosen option (board tabs), as in Settings. */
export const OPTION_ON = 'bg-brand-emerald/10 border-brand-emerald text-white';
export const OPTION_OFF =
  'bg-brand-surface/50 border-brand-border text-white/80 hover:text-white hover:border-brand-emerald/40';
export const BTN_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-brand-surface transition-colors disabled:opacity-50';
export function Avatar({
  name,
  photoUrl,
  avatarId,
  size = 'w-10 h-10',
}: {
  name: string;
  photoUrl?: string;
  avatarId?: string;
  size?: string;
}) {
  return (
    <UserAvatar
      photoUrl={photoUrl}
      avatarId={avatarId}
      name={name}
      className={`${size} text-sm ring-2 ring-brand-border shrink-0`}
    />
  );
}

/** A bottom sheet / dialog, portaled: the page sits in AnimatedBackground's
 *  `relative z-10`, under the sticky navbar. */
export function Sheet({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
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
        aria-labelledby={labelledBy}
        className="bg-brand-deep rounded-card p-5 w-full max-w-md shadow-elev-3 border border-brand-border space-y-4 max-h-[85vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function SheetHeader({
  id,
  Icon,
  title,
  subtitle,
  onClose,
}: {
  id: string;
  Icon: SvgIcon;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 shrink-0">
          <Icon className="w-5 h-5 text-brand-emerald" />
        </span>
        <div className="min-w-0">
          <h3 id={id} className="font-display text-lg font-bold text-white leading-tight">
            {title}
          </h3>
          <p className="text-white/70 text-xs">{subtitle}</p>
        </div>
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
  );
}

export const Spinner = ({ className = '' }: { className?: string }) => (
  <span className={`loading loading-spinner text-brand-emerald ${className}`} />
);
