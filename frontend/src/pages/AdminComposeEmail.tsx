import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useSendComposedEmail } from '../hooks/useComposeEmail.js';

export default function AdminComposeEmail() {
  const { t } = useTranslation();
  const send = useSendComposedEmail();
  const [form, setForm] = useState({ to: 'istiak@bustandeen.com', subject: '', body: '' });
  const [reviewing, setReviewing] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  const canReview = form.to.trim() && form.subject.trim() && form.body.trim();

  const confirmSend = () => {
    send.mutate(
      { to: form.to.trim(), subject: form.subject.trim(), body: form.body.trim() },
      {
        onSuccess: () => {
          setReviewing(false);
          setSentOk(true);
          setForm({ to: 'istiak@bustandeen.com', subject: '', body: '' });
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
              'Sends from istiak@bustandeen.com to any address you choose — for anything that needs the founder’s own name attached, rather than a system mailbox. Every send here is recorded in the Audit Log, unlike replying directly from the Zoho mail app.'
            )}
          </p>
        </div>

        {sentOk && !reviewing && (
          <div className="rounded-xl border border-brand-emerald/25 bg-brand-emerald/10 px-4 py-3 text-brand-emerald text-sm font-semibold">
            {t('adminCompose.sent', 'Email sent.')}
          </div>
        )}

        {!reviewing && (
          <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-3">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wide font-bold">
                {t('adminCompose.to', 'To')}
              </label>
              <input
                value={form.to}
                onChange={(e) => {
                  setForm((f) => ({ ...f, to: e.target.value }));
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
                value={form.subject}
                onChange={(e) => {
                  setForm((f) => ({ ...f, subject: e.target.value }));
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
                value={form.body}
                onChange={(e) => {
                  setForm((f) => ({ ...f, body: e.target.value }));
                  setSentOk(false);
                }}
                rows={10}
                className="textarea textarea-sm w-full mt-1 bg-white/5 border-brand-emerald/15 text-white rounded-xl"
              />
            </div>
            <button
              onClick={() => setReviewing(true)}
              disabled={!canReview}
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
              <span className="text-white/40">{t('adminCompose.to', 'To')}:</span> {form.to}
            </p>
            <p className="text-white/80 text-sm">
              <span className="text-white/40">{t('adminCompose.subject', 'Subject')}:</span>{' '}
              {form.subject}
            </p>
            <p className="text-white/70 text-sm whitespace-pre-wrap border-t border-white/10 pt-3">
              {form.body}
            </p>
            {errorMessage && <p className="text-red-400 text-xs">{errorMessage}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmSend}
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
