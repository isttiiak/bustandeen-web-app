import { useState } from 'react';
import { m as motion } from 'framer-motion';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY, CARD, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import {
  ADMIN_INPUT_SM,
  AdminHero,
  BTN_DANGER,
  BTN_SMALL,
  OPTION_CHIP,
  PILL_EMERALD,
  PILL_GOLD,
  PILL_MUTED,
} from '../components/admin/adminParts.js';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';
import {
  useAdminFeedback,
  useReplyFeedback,
  useMarkRepliedExternal,
  useArchiveFeedback,
  useDeleteFeedback,
  type AdminFeedbackMessage,
  type FeedbackStatus,
} from '../hooks/useAdminFeedback.js';

function FeedbackCard({ message }: { message: AdminFeedbackMessage }) {
  const { t } = useTranslation();
  const isServant = useAdminStore((s) => s.role) === 'servant';
  const reply = useReplyFeedback();
  const markRepliedExternal = useMarkRepliedExternal();
  const archive = useArchiveFeedback();
  const del = useDeleteFeedback();
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
            {message.name} <span className="text-white/70 font-normal">· {message.email}</span>
          </p>
          {message.category.length > 0 && (
            <p className="text-white/70 text-xs mt-0.5">{message.category.join(', ')}</p>
          )}
        </div>
        <span
          className={`shrink-0 uppercase tracking-wide ${
            message.status === 'open'
              ? PILL_GOLD
              : message.status === 'replied'
                ? PILL_EMERALD
                : PILL_MUTED
          }`}
        >
          {message.status}
        </span>
      </div>

      <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
      <p className="text-white/70 text-[11px]">
        {new Date(message.createdAt).toLocaleString()}
        {message.repliedBy &&
          `, ${t('adminFeedback.repliedBy', 'replied by')} ${message.repliedBy}`}
      </p>

      {!replying && (
        <div className="flex gap-2 pt-1">
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
                      'Mark as replied? Only do this if you already sent a reply yourself (e.g. via the Zoho mail app). This does not send anything.'
                    )
                  )
                )
                  markRepliedExternal.mutate(message._id);
              }}
              className={BTN_SMALL}
              title={t(
                'adminFeedback.markRepliedTitle',
                'Use this if you already replied outside the admin panel'
              )}
            >
              {t('adminFeedback.markReplied', 'Mark replied (sent via Zoho)')}
            </button>
          )}
          {message.status !== 'archived' && (
            <button onClick={() => archive.mutate(message._id)} className={BTN_SMALL}>
              {t('adminFeedback.archive', 'Archive')}
            </button>
          )}
          {isServant && (
            <button
              onClick={() => {
                if (confirm(t('adminFeedback.confirmDelete', 'Delete this message permanently?')))
                  del.mutate(message._id);
              }}
              className={BTN_DANGER}
            >
              {t('adminFeedback.delete', 'Delete')}
            </button>
          )}
        </div>
      )}

      {replying && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <textarea
            className={`${ADMIN_INPUT_SM} w-full`}
            rows={5}
            placeholder={t('adminFeedback.replyPlaceholder', 'Your reply…')}
            aria-label={t('adminFeedback.replyPlaceholder', 'Your reply…')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
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

export default function AdminFeedback() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('open');
  const { data, isLoading } = useAdminFeedback(filter, 1, 50);

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminFeedback.seoTitle', 'Feedback Inbox')}
        description="Internal dashboard."
        path="/admin/feedback"
        index={false}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero
          icon={EnvelopeIcon}
          title={t('adminFeedback.title', 'Feedback & contact inbox')}
        />

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
          {isLoading && (
            <p className="text-white/70 text-sm">{t('adminZikr.loading', 'Loading…')}</p>
          )}
          {!isLoading && data?.messages.length === 0 && (
            <p className="text-white/70 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
          )}
          {data?.messages.map((m) => (
            <FeedbackCard key={m._id} message={m} />
          ))}
        </div>
      </div>
    </AnimatedBackground>
  );
}
