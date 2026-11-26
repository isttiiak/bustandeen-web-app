import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  LockClosedIcon,
  ShareIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, REF_LINK } from '../bustanStyles.js';
import { Sheet, SheetHeader, Spinner } from './friendsParts.js';

/** The invite dialog: my link, copy, and what it does. */
export function FriendsInviteSheet({
  onClose,
  isError,
  refetch,
  inviteLink,
  copied,
  copyLink,
}: {
  onClose: () => void;
  isError: boolean;
  refetch: () => Promise<unknown>;
  inviteLink: string;
  copied: boolean;
  copyLink: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Sheet onClose={onClose} labelledBy="friends-invite-title">
      <SheetHeader
        id="friends-invite-title"
        Icon={UserPlusIcon}
        title={t('friends.connectFriend')}
        subtitle={t('friends.inviteSubtitle')}
        onClose={onClose}
      />

      <div className="text-center px-2">
        <p className="font-display text-base text-white/85">{t('friends.verseCompete')}</p>
        <a
          href="https://quran.com/2/148"
          target="_blank"
          rel="noopener noreferrer"
          className={REF_LINK}
        >
          {t('friends.quranRef')}
        </a>
      </div>

      {isError ? (
        <div className="text-center space-y-3 py-2">
          <p className="text-white/85 text-sm">{t('friends.inviteError')}</p>
          <button type="button" onClick={() => void refetch()} className={BTN_PRIMARY}>
            {t('friends.tryAgain')}
          </button>
        </div>
      ) : inviteLink ? (
        <>
          <div className="flex gap-2">
            <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-control bg-shade/20 border border-brand-border text-brand-emerald text-xs">
              {inviteLink}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              className={`${BTN_PRIMARY} shrink-0`}
            >
              {copied ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
              {copied ? t('friends.copied') : t('friends.copy')}
            </button>
          </div>
          <ul className="space-y-2 text-xs text-white/80 leading-relaxed">
            <li className="flex items-start gap-2">
              <ShareIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
              {t('friends.inviteShareTip')}
            </li>
            <li className="flex items-start gap-2">
              <LinkIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
              {t('friends.inviteLinkTip')}
            </li>
            <li className="flex items-start gap-2">
              <LockClosedIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
              {t('friends.invitePrivacy')}
            </li>
          </ul>
        </>
      ) : (
        <div className="grid place-items-center py-4">
          <Spinner />
        </div>
      )}
    </Sheet>
  );
}
