import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BTN_PRIMARY, BTN_SECONDARY } from '../../bustanStyles.js';
import { ADMIN_INPUT_SM, BTN_SMALL } from '../adminParts.js';
import { useDonorEmailDraft, useSendDonorEmail } from '../../../hooks/useAdminSadaqah.js';

export function DonorEmailAction({ email }: { email: string }) {
  const { t } = useTranslation();
  const draft = useDonorEmailDraft();
  const send = useSendDonorEmail();
  const [form, setForm] = useState<{ subject: string; body: string } | null>(null);

  const start = () => {
    draft.mutate(email, { onSuccess: (d) => setForm(d) });
  };
  const confirmSend = () => {
    if (!form) return;
    send.mutate(
      { email, subject: form.subject, body: form.body },
      { onSuccess: () => setForm(null) }
    );
  };

  if (!form) {
    return (
      <button onClick={start} disabled={draft.isPending} className={BTN_SMALL}>
        {draft.isPending ? '…' : t('adminSadaqah.sendEmail', 'Send email')}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-card border border-brand-emerald/20 bg-brand-deep p-5 space-y-3">
        <p className="text-white font-bold text-sm">
          {t('adminSadaqah.emailTo', 'Email to')} {email}
        </p>
        <p className="text-white/70 text-xs">
          {t(
            'adminSadaqah.emailEditableNote',
            'Prefilled: edit anything before sending. This is exactly what the donor receives.'
          )}
        </p>
        <input
          value={form.subject}
          onChange={(e) => setForm((f) => (f ? { ...f, subject: e.target.value } : f))}
          className="px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors w-full"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm((f) => (f ? { ...f, body: e.target.value } : f))}
          rows={9}
          className={`${ADMIN_INPUT_SM} w-full font-mono`}
        />
        <div className="flex gap-2">
          <button onClick={confirmSend} disabled={send.isPending} className={BTN_PRIMARY}>
            {send.isPending ? '…' : t('adminSadaqah.confirmSendEmail', 'Send this email')}
          </button>
          <button onClick={() => setForm(null)} className={BTN_SECONDARY}>
            {t('adminZikr.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
