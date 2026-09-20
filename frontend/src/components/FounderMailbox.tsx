import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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

const statusChip = (status: FeedbackStatus) =>
  `shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${
    status === 'open'
      ? 'bg-brand-gold/15 text-brand-gold'
      : status === 'replied'
        ? 'bg-brand-emerald/15 text-brand-emerald'
        : 'bg-white/10 text-white/40'
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
      className="rounded-2xl border border-brand-emerald/15 bg-white/[0.03] p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">
            {message.fromName || message.fromEmail}{' '}
            {message.fromName && (
              <span className="text-white/30 font-normal">· {message.fromEmail}</span>
            )}
          </p>
          <p className="text-white/50 text-xs mt-0.5 break-words">
            {message.subject || t('adminFeedback.noSubject', '(no subject)')}
          </p>
        </div>
        <span className={statusChip(message.status)}>{message.status}</span>
      </div>

      <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.text || t('adminFeedback.noBody', '(no text content)')}
      </p>
      <p className="text-white/25 text-[11px]">
        {new Date(message.receivedAt).toLocaleString()}
        {message.feedbackId && ` - ${t('adminFeedback.inThread', 'reply in a feedback thread')}`}
        {message.repliedBy &&
          ` - ${t('adminFeedback.repliedBy', 'replied by')} ${message.repliedBy}`}
      </p>

      {!replying && (
        <div className="flex flex-wrap gap-2 pt-1">
          {message.status !== 'archived' && (
            <button
              onClick={() => setReplying(true)}
              className="btn btn-xs rounded-lg bg-brand-emerald border-brand-emerald text-white font-bold"
            >
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
              className="btn btn-xs btn-ghost rounded-lg text-white/50"
            >
              {t('adminFeedback.markReplied', 'Mark replied (sent via Zoho)')}
            </button>
          )}
          {message.status !== 'archived' && (
            <button
              onClick={() => archive.mutate(message._id)}
              className="btn btn-xs btn-ghost rounded-lg text-white/50"
            >
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
            className="btn btn-xs btn-ghost rounded-lg text-red-400/70 hover:text-red-400"
          >
            {t('adminFeedback.delete', 'Delete')}
          </button>
        </div>
      )}

      {replying && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <textarea
            className="textarea textarea-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
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
            <button
              onClick={sendReply}
              disabled={reply.isPending}
              className="btn btn-xs rounded-lg bg-brand-emerald border-brand-emerald text-white font-bold"
            >
              {reply.isPending ? '…' : t('adminFeedback.send', 'Send reply')}
            </button>
            <button
              onClick={() => setReplying(false)}
              className="btn btn-xs btn-ghost rounded-lg text-white/50"
            >
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
        <div className="rounded-xl border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-sm text-brand-gold">
          {t(
            'adminMailbox.paused',
            'Founder mailbox sync is paused. Zoho’s free plan has no IMAP access, so it will be switched on once a paid plan is added. Nothing is fetched from Zoho until then; reply to mail from the Zoho app in the meantime.'
          )}
        </div>
      )}

      {enabled && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
          <button
            onClick={() => syncMailbox()}
            disabled={syncing}
            className="btn btn-xs rounded-lg btn-ghost text-white/70"
          >
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

      <div className="flex gap-2">
        {(['open', 'replied', 'archived', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn btn-xs rounded-lg ${filter === s ? 'bg-brand-emerald border-brand-emerald text-white' : 'btn-ghost text-white/50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mailbox.isLoading && (
          <p className="text-white/40 text-sm">{t('adminZikr.loading', 'Loading…')}</p>
        )}
        {!mailbox.isLoading && mailbox.data?.messages.length === 0 && (
          <p className="text-white/40 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
        )}
        {mailbox.data?.messages.map((m) => (
          <MailboxCard key={m._id} message={m} />
        ))}
      </div>
    </div>
  );
}
