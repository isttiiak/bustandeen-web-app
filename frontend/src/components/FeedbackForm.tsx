import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore.js';
import { celebrateSmall } from '../utils/celebrate.js';
import api from '../lib/api.js';

/**
 * Shared interactive form for /feedback and /contact.
 *
 * Delivery goes through our own backend (POST /api/feedback) — stored in
 * FeedbackMessage so it's manageable from /admin/feedback (read/reply/
 * archive/delete), and still emails the review inbox so nothing regresses if
 * the inbox isn't checked. Previously posted straight to Web3Forms, which
 * never stored anything in our own DB. A honeypot field blocks the usual
 * spam bots (checked server-side now, not by Web3Forms).
 */

export interface FormType {
  id: string;
  label: string;
  emoji: string;
  /** tailwind classes for the selected state */
  active: string;
  hint: string;
}

export default function FeedbackForm({
  kind,
  types,
  submitLabel,
}: {
  kind: 'feedback' | 'contact';
  types: FormType[];
  submitLabel?: string;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const resolvedSubmitLabel = submitLabel ?? t('feedbackForm.send', 'Send');

  const [name, setName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [botcheck, setBotcheck] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleType = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectedLabels = selectedIds
    .map((id) => types.find((ty) => ty.id === id)?.label)
    .filter(Boolean);
  const canSend =
    !!name.trim() &&
    !!email.trim() &&
    selectedIds.length > 0 &&
    message.trim().length >= 10 &&
    !sending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/feedback', {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        category: selectedLabels,
        kind,
        botcheck,
      });
      if (!res.data.ok) throw new Error(res.data.error ?? 'Failed');
      setSent(true);
      celebrateSmall();
    } catch {
      setError(
        t(
          'feedbackForm.sendFail',
          'Could not send right now — please check your connection and try again.'
        )
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-brand-emerald/30 bg-brand-emerald/[0.07] p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
        >
          <CheckCircleIcon className="w-16 h-16 text-brand-emerald mx-auto" />
        </motion.div>
        <h2 className="text-white font-black text-xl mt-3">
          {t('feedbackForm.thanks', 'JazākAllāhu khayran! 💚')}
        </h2>
        <p className="text-white/50 text-sm mt-2 leading-relaxed max-w-md mx-auto">
          {kind === 'feedback'
            ? t(
                'feedbackForm.receivedFeedback',
                "Your feedback reached us. Every note genuinely shapes what Bustandeen becomes next — and if it needs a reply, we'll write back to"
              )
            : t(
                'feedbackForm.receivedMessage',
                "Your message reached us. Every note genuinely shapes what Bustandeen becomes next — and if it needs a reply, we'll write back to"
              )}{' '}
          <b className="text-white/75">{email}</b>.
        </p>
        <button
          className="btn btn-sm mt-5 rounded-xl bg-white/5 border-brand-emerald/15 text-white/70"
          onClick={() => {
            setSent(false);
            setMessage('');
            setSelectedIds([]);
          }}
        >
          {t('feedbackForm.sendAnother', 'Send another')}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* honeypot — hidden from humans, catches bots */}
      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        checked={!!botcheck}
        onChange={(e) => setBotcheck(e.target.checked ? 'bot' : '')}
      />

      {/* ── Type (multi-select — becomes the subject) ── */}
      <div>
        <label className="text-white/70 text-sm font-bold">
          {t('feedbackForm.aboutLabel', "What's this about?")}{' '}
          <span className="text-red-400">*</span>
        </label>
        <p className="text-white/30 text-xs mt-0.5 mb-2.5">
          {t('feedbackForm.aboutHint', 'Select all that apply — you can pick more than one.')}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {types.map((ty, i) => {
            const on = selectedIds.includes(ty.id);
            return (
              <motion.button
                key={ty.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleType(ty.id)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  on
                    ? ty.active
                    : 'bg-white/[0.03] border-brand-emerald/10 text-white/60 hover:border-brand-emerald/25 hover:text-white/80'
                }`}
              >
                <span className="text-lg">{ty.emoji}</span>
                <p className="font-bold text-sm mt-0.5">{ty.label}</p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${on ? 'opacity-80' : 'text-white/30'}`}
                >
                  {ty.hint}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Name + email ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/70 text-sm font-bold" htmlFor="fb-name">
            {t('feedbackForm.nameLabel', 'Your name')} <span className="text-red-400">*</span>
          </label>
          <input
            id="fb-name"
            type="text"
            required
            value={name}
            readOnly={!!user?.displayName}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('feedbackForm.namePlaceholder', 'e.g. Abdullah')}
            className={`input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white ${user?.displayName ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label className="text-white/70 text-sm font-bold" htmlFor="fb-email">
            {t('feedbackForm.emailLabel', 'Email')} <span className="text-red-400">*</span>
          </label>
          <input
            id="fb-email"
            type="email"
            required
            value={email}
            readOnly={!!user?.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white ${user?.email ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
      {user && (
        <p className="text-white/25 text-[11px] -mt-2">
          {t(
            'feedbackForm.autofilled',
            'Filled in from your account so we can reply to the right person.'
          )}
        </p>
      )}

      {/* ── Message ── */}
      <div>
        <div className="flex items-end justify-between">
          <label className="text-white/70 text-sm font-bold" htmlFor="fb-msg">
            {t('feedbackForm.messageLabel', 'Tell us more')} <span className="text-red-400">*</span>
          </label>
          <span
            className={`text-[11px] ${message.trim().length >= 10 ? 'text-white/25' : 'text-brand-gold/60'}`}
          >
            {message.trim().length < 10
              ? t('feedbackForm.moreChars', '{{count}} more characters', {
                  count: 10 - message.trim().length,
                })
              : t('feedbackForm.charCount', '{{count}} characters', { count: message.length })}
          </span>
        </div>
        <textarea
          id="fb-msg"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          placeholder={
            selectedIds.length > 1
              ? t(
                  'feedbackForm.multiTopicPlaceholder',
                  'Please separate each topic in its own paragraph — one issue per paragraph makes it easier for us to track and fix.'
                )
              : kind === 'feedback'
                ? t(
                    'feedbackForm.feedbackPlaceholder',
                    'What happened, or what would make Bustandeen better for you? Steps to reproduce a bug are gold.'
                  )
                : t('feedbackForm.contactPlaceholder', 'How can we help?')
          }
          className="textarea textarea-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white leading-relaxed"
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-400 text-sm"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.98 }}
        disabled={!canSend}
        className="w-full btn h-12 rounded-2xl border-0 text-white font-black bg-gradient-to-r from-brand-emerald via-brand-info to-brand-info hover:opacity-90 disabled:opacity-40 gap-2"
      >
        {sending ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <PaperAirplaneIcon className="w-5 h-5" />
        )}
        {sending ? t('feedbackForm.sending', 'Sending…') : resolvedSubmitLabel}
      </motion.button>
      <p className="text-white/25 text-[11px] text-center">
        {t(
          'feedbackForm.privacyNote',
          'We only use what you send here to reply and improve Bustandeen — never for anything else.'
        )}
      </p>
    </form>
  );
}
