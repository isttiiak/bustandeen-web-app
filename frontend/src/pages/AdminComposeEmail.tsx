import { useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useSendComposedEmail } from '../hooks/useComposeEmail.js';
import {
  useAdminFeedback,
  type AdminFeedbackMessage,
  type FeedbackStatus,
} from '../hooks/useAdminFeedback.js';

type Mode = 'inbox' | 'custom';

function InboxPicker({ onPick }: { onPick: (message: AdminFeedbackMessage) => void }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminFeedback(filter, 1, 100);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.messages ?? [];
    return (data?.messages ?? []).filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
    );
  }, [data?.messages, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {(['open', 'replied', 'archived', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn btn-xs rounded-lg ${filter === s ? 'bg-brand-emerald border-brand-emerald text-white' : 'btn-ghost text-white/50'}`}
          >
            {s}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adminCompose.searchPlaceholder', 'Search name, email, message…')}
          className="input input-xs ml-auto w-56 bg-white/5 border-brand-emerald/15 text-white rounded-lg"
        />
      </div>

      <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
        {isLoading && <p className="text-white/40 text-sm">{t('adminZikr.loading', 'Loading…')}</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-white/40 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
        )}
        {filtered.map((m) => (
          <motion.button
            key={m._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onPick(m)}
            className="w-full text-left rounded-xl border border-brand-emerald/15 bg-white/[0.03] hover:bg-white/[0.06] p-3 space-y-1 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-white font-bold text-sm min-w-0 truncate">
                {m.name} <span className="text-white/30 font-normal">· {m.email}</span>
              </p>
              <span
                className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  m.status === 'open'
                    ? 'bg-brand-gold/15 text-brand-gold'
                    : m.status === 'replied'
                      ? 'bg-brand-emerald/15 text-brand-emerald'
                      : 'bg-white/10 text-white/40'
                }`}
              >
                {m.status}
              </span>
            </div>
            <p className="text-white/50 text-xs line-clamp-2">{m.message}</p>
            <p className="text-white/25 text-[11px]">{new Date(m.createdAt).toLocaleString()}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function AdminComposeEmail() {
  const { t } = useTranslation();
  const send = useSendComposedEmail();
  const [mode, setMode] = useState<Mode>('inbox');
  const [selected, setSelected] = useState<AdminFeedbackMessage | null>(null);
  const [customForm, setCustomForm] = useState({ to: '', subject: '', body: '' });
  const [threadBody, setThreadBody] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelected(null);
    setReviewing(false);
    setSentOk(false);
  };

  const canReviewCustom =
    customForm.to.trim() && customForm.subject.trim() && customForm.body.trim();
  const canReviewThread = !!selected && threadBody.trim();

  const confirmSendCustom = () => {
    send.mutate(
      {
        to: customForm.to.trim(),
        subject: customForm.subject.trim(),
        body: customForm.body.trim(),
      },
      {
        onSuccess: () => {
          setReviewing(false);
          setSentOk(true);
          setCustomForm({ to: '', subject: '', body: '' });
        },
      }
    );
  };

  const confirmSendThread = () => {
    if (!selected) return;
    send.mutate(
      { feedbackId: selected._id, body: threadBody.trim() },
      {
        onSuccess: () => {
          setReviewing(false);
          setSentOk(true);
          setSelected(null);
          setThreadBody('');
        },
      }
    );
  };

  const errorMessage = send.error
    ? axios.isAxiosError(send.error) && send.error.response?.data?.error
      ? String(send.error.response.data.error)
      : t('adminCompose.genericError', 'Something went wrong sending this.')
    : null;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminCompose.seoTitle', 'Compose Email')}
        description="Internal dashboard."
        path="/admin/compose-email"
        index={false}
      />
      <div className="max-w-3xl mx-auto px-6 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('adminCompose.title', 'Compose email')}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {t(
              'adminCompose.subtitle',
              'Sends from istiak@bustandeen.com — for anything that needs the founder’s own name attached, rather than a system mailbox. Every send here is recorded in the Audit Log, unlike replying directly from the Zoho mail app.'
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => switchMode('inbox')}
            className={`btn btn-sm rounded-lg ${mode === 'inbox' ? 'bg-brand-emerald border-brand-emerald text-white' : 'btn-ghost text-white/50'}`}
          >
            {t('adminCompose.modeInbox', 'Reply to someone who wrote in')}
          </button>
          <button
            onClick={() => switchMode('custom')}
            className={`btn btn-sm rounded-lg ${mode === 'custom' ? 'bg-brand-emerald border-brand-emerald text-white' : 'btn-ghost text-white/50'}`}
          >
            {t('adminCompose.modeCustom', 'Custom recipient')}
          </button>
        </div>

        {sentOk && !reviewing && (
          <div className="rounded-xl border border-brand-emerald/25 bg-brand-emerald/10 px-4 py-3 text-brand-emerald text-sm font-semibold">
            {t('adminCompose.sent', 'Email sent.')}
          </div>
        )}

        {mode === 'inbox' && !reviewing && !selected && (
          <InboxPicker
            onPick={(m) => {
              setSelected(m);
              setSentOk(false);
            }}
          />
        )}

        {mode === 'inbox' && !reviewing && selected && (
          <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-3">
            <button
              onClick={() => setSelected(null)}
              className="text-white/40 hover:text-white/70 text-xs"
            >
              {t('adminCompose.backToList', '← Back to list')}
            </button>
            <div className="text-sm text-white/70">
              <span className="text-white/40">{t('adminCompose.to', 'To')}:</span> {selected.name}{' '}
              <span className="text-white/40">&lt;{selected.email}&gt;</span>
            </div>
            <p className="text-white/40 text-xs">
              {t(
                'adminCompose.threadNote',
                'Subject is kept identical to the original conversation so this reply lands in the same email thread.'
              )}
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-white/25 text-[11px] mb-1">
                {t('adminCompose.originalMessage', 'Their message')} ·{' '}
                {new Date(selected.createdAt).toLocaleString()}
              </p>
              <p className="text-white/60 text-sm whitespace-pre-wrap">{selected.message}</p>
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wide font-bold">
                {t('adminCompose.body', 'Message')}
              </label>
              <textarea
                value={threadBody}
                onChange={(e) => setThreadBody(e.target.value)}
                rows={8}
                placeholder={t('adminFeedback.replyPlaceholder', 'Your reply…')}
                className="textarea textarea-sm w-full mt-1 bg-white/5 border-brand-emerald/15 text-white rounded-xl"
              />
            </div>
            <button
              onClick={() => setReviewing(true)}
              disabled={!canReviewThread}
              className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
            >
              {t('adminCompose.review', 'Review & send')}
            </button>
          </div>
        )}

        {mode === 'custom' && !reviewing && (
          <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-3">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wide font-bold">
                {t('adminCompose.to', 'To')}
              </label>
              <input
                value={customForm.to}
                onChange={(e) => {
                  setCustomForm((f) => ({ ...f, to: e.target.value }));
                  setSentOk(false);
                }}
                placeholder="someone@example.com"
                className="input input-sm w-full mt-1 bg-white/5 border-brand-emerald/15 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wide font-bold">
                {t('adminCompose.subject', 'Subject')}
              </label>
              <input
                value={customForm.subject}
                onChange={(e) => {
                  setCustomForm((f) => ({ ...f, subject: e.target.value }));
                  setSentOk(false);
                }}
                className="input input-sm w-full mt-1 bg-white/5 border-brand-emerald/15 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wide font-bold">
                {t('adminCompose.body', 'Message')}
              </label>
              <textarea
                value={customForm.body}
                onChange={(e) => {
                  setCustomForm((f) => ({ ...f, body: e.target.value }));
                  setSentOk(false);
                }}
                rows={10}
                className="textarea textarea-sm w-full mt-1 bg-white/5 border-brand-emerald/15 text-white rounded-xl"
              />
            </div>
            <button
              onClick={() => setReviewing(true)}
              disabled={!canReviewCustom}
              className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
            >
              {t('adminCompose.review', 'Review & send')}
            </button>
          </div>
        )}

        {reviewing && (
          <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-4 space-y-3">
            <p className="text-brand-gold text-xs font-bold uppercase tracking-wide">
              {t('adminCompose.reviewLabel', 'Review before sending — this cannot be unsent')}
            </p>
            <p className="text-white/80 text-sm">
              <span className="text-white/40">{t('adminCompose.to', 'To')}:</span>{' '}
              {mode === 'inbox' && selected
                ? `${selected.name} <${selected.email}>`
                : customForm.to}
            </p>
            {mode === 'custom' && (
              <p className="text-white/80 text-sm">
                <span className="text-white/40">{t('adminCompose.subject', 'Subject')}:</span>{' '}
                {customForm.subject}
              </p>
            )}
            <p className="text-white/70 text-sm whitespace-pre-wrap border-t border-white/10 pt-3">
              {mode === 'inbox' ? threadBody : customForm.body}
            </p>
            {errorMessage && <p className="text-red-400 text-xs">{errorMessage}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={mode === 'inbox' ? confirmSendThread : confirmSendCustom}
                disabled={send.isPending}
                className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
              >
                {send.isPending ? '…' : t('adminCompose.confirmSend', 'Send this email')}
              </button>
              <button
                onClick={() => setReviewing(false)}
                disabled={send.isPending}
                className="btn btn-sm btn-ghost text-white/50"
              >
                {t('adminZikr.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}
