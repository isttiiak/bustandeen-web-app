import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
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
      className="rounded-2xl border border-brand-emerald/15 bg-white/[0.03] p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">
            {message.name} <span className="text-white/30 font-normal">· {message.email}</span>
          </p>
          {message.category.length > 0 && (
            <p className="text-white/40 text-xs mt-0.5">{message.category.join(', ')}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${
            message.status === 'open'
              ? 'bg-brand-gold/15 text-brand-gold'
              : message.status === 'replied'
                ? 'bg-brand-emerald/15 text-brand-emerald'
                : 'bg-white/10 text-white/40'
          }`}
        >
          {message.status}
        </span>
      </div>

      <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
      <p className="text-white/25 text-[11px]">
        {new Date(message.createdAt).toLocaleString()}
        {message.repliedBy &&
          ` — ${t('adminFeedback.repliedBy', 'replied by')} ${message.repliedBy}`}
      </p>

      {!replying && (
        <div className="flex gap-2 pt-1">
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
                      'Mark as replied? Only do this if you already sent a reply yourself (e.g. via the Zoho mail app) — this does not send anything.'
                    )
                  )
                )
                  markRepliedExternal.mutate(message._id);
              }}
              className="btn btn-xs btn-ghost rounded-lg text-white/50"
              title={t(
                'adminFeedback.markRepliedTitle',
                'Use this if you already replied outside the admin panel'
              )}
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
          {isServant && (
            <button
              onClick={() => {
                if (confirm(t('adminFeedback.confirmDelete', 'Delete this message permanently?')))
                  del.mutate(message._id);
              }}
              className="btn btn-xs btn-ghost rounded-lg text-red-400/70 hover:text-red-400"
            >
              {t('adminFeedback.delete', 'Delete')}
            </button>
          )}
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
      <div className="max-w-5xl mx-auto px-6 py-6 sm:py-10 space-y-6">
        <h1 className="text-2xl font-black text-white">
          {t('adminFeedback.title', 'Feedback & contact inbox')}
        </h1>

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
          {isLoading && (
            <p className="text-white/40 text-sm">{t('adminZikr.loading', 'Loading…')}</p>
          )}
          {!isLoading && data?.messages.length === 0 && (
            <p className="text-white/40 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
          )}
          {data?.messages.map((m) => (
            <FeedbackCard key={m._id} message={m} />
          ))}
        </div>
      </div>
    </AnimatedBackground>
  );
}
