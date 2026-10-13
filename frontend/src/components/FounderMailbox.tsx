import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  useAdminMailbox,
  useSyncMailbox,
  useReplyMailbox,
  useMarkMailboxRepliedExternal,
  useArchiveMailbox,
  useDeleteMailbox,
  type AdminMailboxMessage,
  type FeedbackStatus,
} from '../hooks/useAdminFeedback.js';
import { BTN_PRIMARY, CARD, OPTION_OFF, OPTION_ON } from './bustanStyles.js';
import {
  ADMIN_INPUT_SM,
  BTN_DANGER,
  BTN_SMALL,
  OPTION_CHIP,
  PILL_EMERALD,
  PILL_GOLD,
  PILL_MUTED,
} from './admin/adminParts.js';

const statusChip = (status: FeedbackStatus) =>
  `shrink-0 uppercase tracking-wide ${
    status === 'open' ? PILL_GOLD : status === 'replied' ? PILL_EMERALD : PILL_MUTED
  }`;

function MailboxCard({ message }: { message: AdminMailboxMessage }) {
  const { t } = useTranslation();
  const reply = useReplyMailbox();
  const markReplied = useMarkMailboxRepliedExternal();
  const archive = useArchiveMailbox();
  const del = useDeleteMailbox();
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState('');

  const sendReply = () => {
    if (!body.trim()) return;
    reply.mutate({ id: message._id, body: body.trim() }, { onSuccess: () => setReplying(false) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} p-4 space-y-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">
            {message.fromName || message.fromEmail}{' '}
            {message.fromName && (
              <span className="text-white/70 font-normal">· {message.fromEmail}</span>
            )}
          </p>
          <p className="text-white/70 text-xs mt-0.5 break-words">
            {message.subject || t('adminFeedback.noSubject', '(no subject)')}
          </p>
        </div>
        <span className={statusChip(message.status)}>{message.status}</span>
      </div>

      <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.text || t('adminFeedback.noBody', '(no text content)')}
      </p>
      <p className="text-white/70 text-[11px]">
        {new Date(message.receivedAt).toLocaleString()}
        {message.feedbackId && ` - ${t('adminFeedback.inThread', 'reply in a feedback thread')}`}
        {message.repliedBy &&
          ` - ${t('adminFeedback.repliedBy', 'replied by')} ${message.repliedBy}`}
      </p>

      {!replying && (
        <div className="flex flex-wrap gap-2 pt-1">
          {message.status !== 'archived' && (
            <button onClick={() => setReplying(true)} className={BTN_PRIMARY}>
              {t('adminFeedback.reply', 'Reply')}
            </button>
          )}
          {message.status === 'open' && (
            <button
              onClick={() => {
                if (
                  confirm(
                    t(
                      'adminFeedback.confirmMarkReplied',
                      'Mark as replied? Only do this if you already sent a reply yourself (e.g. via the Zoho mail app) - this does not send anything.'
                    )
                  )
                )
                  markReplied.mutate(message._id);
              }}
              className={BTN_SMALL}
            >
              {t('adminFeedback.markReplied', 'Mark replied (sent via Zoho)')}
            </button>
          )}
          {message.status !== 'archived' && (
            <button onClick={() => archive.mutate(message._id)} className={BTN_SMALL}>
              {t('adminFeedback.archive', 'Archive')}
            </button>
          )}
          <button
            onClick={() => {
              if (
                confirm(
                  t(
                    'adminFeedback.confirmDeleteMail',
                    'Remove this from the panel? The original stays in your Zoho mailbox.'
                  )
                )
              )
                del.mutate(message._id);
            }}
            className={BTN_DANGER}
          >
            {t('adminFeedback.delete', 'Delete')}
          </button>
        </div>
      )}

      {replying && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <textarea
            className={`${ADMIN_INPUT_SM} w-full`}
            aria-label={t('adminFeedback.replyPlaceholder', 'Your reply…')}
            rows={5}
            placeholder={t('adminFeedback.replyPlaceholder', 'Your reply…')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {reply.isError && (
            <p className="text-red-400 text-xs">
              {t('adminFeedback.sendFailed', 'Could not send. Check System & ops health.')}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={sendReply} disabled={reply.isPending} className={BTN_PRIMARY}>
              {reply.isPending ? '…' : t('adminFeedback.send', 'Send reply')}
            </button>
            <button onClick={() => setReplying(false)} className={BTN_SMALL}>
              {t('adminZikr.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** The founder's real istiak@ inbox, synced over IMAP. Sync is switched off
 *  server-side (MAILBOX_SYNC_ENABLED) until Zoho IMAP is available, in which
 *  case this shows a paused notice and only lists what was already synced. */
export default function FounderMailbox() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('open');
  const mailbox = useAdminMailbox(filter, true);
  const { mutate: syncMailbox, isPending: syncing } = useSyncMailbox();
  const sync = mailbox.data?.sync;
  const enabled = sync?.enabled ?? false;

  // Pull fresh mail once the list confirms sync is actually switched on.
  useEffect(() => {
    if (enabled) syncMailbox();
  }, [enabled, syncMailbox]);

  return (
    <div className="space-y-4">
      {sync && !sync.enabled && (
        <div className="rounded-control border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-sm text-brand-gold">
          {t(
            'adminMailbox.paused',
            'Founder mailbox sync is paused. Zoho’s free plan has no IMAP access, so it will be switched on once a paid plan is added. Nothing is fetched from Zoho until then; reply to mail from the Zoho app in the meantime.'
          )}
        </div>
      )}

      {enabled && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          <button onClick={() => syncMailbox()} disabled={syncing} className={BTN_SMALL}>
            {syncing
              ? t('adminFeedback.syncing', 'Syncing…')
              : t('adminFeedback.syncNow', 'Sync now')}
          </button>
          {sync && !sync.configured && (
            <span className="text-brand-gold">
              {t(
                'adminFeedback.notConfigured',
                'Mailbox sync is not set up yet: add the IMAP credentials on the server.'
              )}
            </span>
          )}
          {sync?.configured && sync.lastSyncAt && (
            <span>
              {t('adminFeedback.lastSynced', 'Last synced')}{' '}
              {new Date(sync.lastSyncAt).toLocaleTimeString()}
            </span>
          )}
          {sync?.lastError && (
            <span className="text-red-400">
              {t('adminFeedback.syncError', 'Last sync failed')}: {sync.lastError}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['open', 'replied', 'archived', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`${OPTION_CHIP} capitalize ${filter === s ? OPTION_ON : OPTION_OFF}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mailbox.isLoading && (
          <p className="text-white/70 text-sm">{t('adminZikr.loading', 'Loading…')}</p>
        )}
        {!mailbox.isLoading && mailbox.data?.messages.length === 0 && (
          <p className="text-white/70 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
        )}
        {mailbox.data?.messages.map((m) => (
          <MailboxCard key={m._id} message={m} />
        ))}
      </div>
    </div>
  );
}
