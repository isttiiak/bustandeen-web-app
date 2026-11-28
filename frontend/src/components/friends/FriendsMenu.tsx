import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EllipsisVerticalIcon,
  EyeIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import type { SvgIcon } from './friendsParts.js';

/** The arch's top-right menu (U3): invite, see friends, what friends see. */
export function FriendsMenu({
  onInvite,
  onSeeFriends,
  onPrivacy,
}: {
  onInvite: () => void;
  onSeeFriends: () => void;
  onPrivacy: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: { Icon: SvgIcon; label: string; onClick: () => void }[] = [
    { Icon: UserPlusIcon, label: t('friends.inviteFriend'), onClick: onInvite },
    { Icon: UsersIcon, label: t('friends.seeFriends'), onClick: onSeeFriends },
    { Icon: EyeIcon, label: t('friends.privacy.title'), onClick: onPrivacy },
  ];

  return (
    // The arch's top corners curve across half its width, so a button 12px
    // from the top corner floated outside the shape. Level with the round icon
    // (centre at 4.5rem) and 12px from the straight edge, it sits inside it.
    <div ref={ref} className="absolute top-[3.125rem] right-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('friends.menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-11 h-11 grid place-items-center rounded-full text-white/85 hover:text-white bg-brand-surface/50 hover:bg-brand-surface border border-brand-border transition-colors"
      >
        <EllipsisVerticalIcon className="w-6 h-6" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-control border border-brand-border bg-brand-deep shadow-elev-3 p-1.5 text-left"
        >
          {items.map(({ Icon, label, onClick }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-left rounded-control text-sm font-semibold text-white/85 hover:text-white hover:bg-brand-surface transition-colors"
            >
              <Icon className="w-5 h-5 text-brand-emerald shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
