import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HandRaisedIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { NUDGE_MESSAGE_MAX, nudgeFailure, useSendNudge } from '../../hooks/useSocial.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { Sheet, SheetHeader } from './friendsParts.js';

/** Compose a nudge to a quiet friend: an optional short message, then send. */
export function NudgeSheet({
  friend,
  onClose,
}: {
  friend: { uid: string; displayName: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const send = useSendNudge();
  const [message, setMessage] = useState('');
  const name = friend.displayName;

  const submit = () => {
    send.mutate(
      { friendUid: friend.uid, message },
      {
        onSuccess: () => {
          toast.success(t('friends.nudge.toastSent', 'Nudge sent to {{name}}', { name }), {
            id: 'friend-nudge',
          });
          onClose();
        },
        onError: (err) => {
          const failure = nudgeFailure(err);
          toast.error(
            failure === 'cooldown'
              ? t('friends.nudge.errCooldown', 'You already nudged {{name}} today.', { name })
              : failure === 'unavailable'
                ? t('friends.nudge.errUnavailable', "You can't nudge this friend right now.")
                : t('friends.nudge.errGeneric', 'Could not send the nudge. Please try again.'),
            { id: 'friend-nudge' }
          );
          if (failure !== 'error') onClose();
        },
      }
    );
  };

  return (
    <Sheet onClose={onClose} labelledBy="friends-nudge-title">
      <SheetHeader
        id="friends-nudge-title"
        Icon={HandRaisedIcon}
        title={t('friends.nudge.title', 'Nudge {{name}}', { name })}
        subtitle={t(
          'friends.nudge.body',
          'A gentle reminder that you are thinking of them. They will see it the next time they open the app.'
        )}
        onClose={onClose}
      />
      <div>
        <label htmlFor="friends-nudge-message" className="block text-white/85 text-xs font-bold">
          {t('friends.nudge.messageLabel', 'Add a short message (optional)')}
        </label>
        <textarea
          id="friends-nudge-message"
          value={message}
          maxLength={NUDGE_MESSAGE_MAX}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('friends.nudge.messagePlaceholder', 'Thinking of you. Come back soon!')}
          className="mt-1.5 w-full rounded-control border border-brand-border bg-brand-surface/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-brand-emerald/60 resize-none"
        />
        <p className="mt-1 text-right text-[11px] text-white/70 tabular-nums">
          {t('friends.nudge.counter', '{{n}} / {{max}}', {
            n: formatLocaleNumber(message.length),
            max: formatLocaleNumber(NUDGE_MESSAGE_MAX),
          })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className={BTN_SECONDARY}>
          {t('common.cancel')}
        </button>
        <button type="button" onClick={submit} disabled={send.isPending} className={BTN_PRIMARY}>
          {t('friends.nudge.send', 'Send nudge')}
        </button>
      </div>
    </Sheet>
  );
}
