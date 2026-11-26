import { useState } from 'react';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BTN_PRIMARY, CARD } from '../../bustanStyles.js';
import { BTN_DANGER, BTN_SMALL } from '../adminParts.js';
import {
  useEmailDraft,
  useRejectDonation,
  useVerifyDonation,
} from '../../../hooks/useAdminSadaqah.js';
import type { Donation } from '../../../types/api.js';
import { donorLabel } from './adminSadaqahUtils.js';

export function PendingCard({ donation }: { donation: Donation }) {
  const { t } = useTranslation();
  const draft = useEmailDraft();
  const verify = useVerifyDonation();
  const reject = useRejectDonation();
  const [mode, setMode] = useState<'idle' | 'verified' | 'rejected'>('idle');
  const [emailText, setEmailText] = useState('');

  // Verify/Reject never send immediately — both open the same editable,
  // prefilled email textarea first, so nothing goes to a donor without the
  // admin actually seeing (and being able to change) the exact wording.
  const startAction = (type: 'verified' | 'rejected') => {
    setMode(type);
    setEmailText('');
    draft.mutate({ id: donation._id, type }, { onSuccess: (d) => setEmailText(d.body) });
  };
  const cancel = () => {
    setMode('idle');
    setEmailText('');
  };
  const confirm = () => {
    const emailBody = emailText.trim();
    if (!emailBody) return;
    // The status change always goes through regardless of the email — this
    // only warns the admin that the donor was never actually notified, so
    // they know to follow up (see sadaqah.service.ts's DonationActionResult).
    const warnIfEmailFailed = (res: { emailSent: boolean }) => {
      if (!res.emailSent) {
        toast.error(
          t(
            'adminSadaqah.emailFailedWarning',
            'Saved, but the email to the donor failed to send. Check System & ops health.'
          )
        );
      }
    };
    if (mode === 'verified')
      verify.mutate({ id: donation._id, emailBody }, { onSuccess: warnIfEmailFailed });
    if (mode === 'rejected')
      reject.mutate({ id: donation._id, emailBody }, { onSuccess: warnIfEmailFailed });
  };
  const sending = verify.isPending || reject.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} p-4 space-y-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm truncate">
            {donorLabel(donation)}
            {donation.onBehalfOf && (
              <span className="text-white/70 font-normal">
                {' '}
                · {t('adminSadaqah.onBehalfOfPrefix', 'on behalf of')} {donation.onBehalfOf}
              </span>
            )}
          </p>
          <p className="text-white/70 text-xs mt-0.5">
            {donation.email} · {donation.phone}
          </p>
        </div>
        <p className="text-brand-gold font-bold text-lg shrink-0">
          {donation.amount.toLocaleString()} <span className="text-xs">BDT</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-control bg-shade/20 px-3 py-2">
          <p className="text-white/70">{t('adminSadaqah.trxId', 'Transaction ID')}</p>
          <p className="text-white font-mono font-bold">{donation.transactionId}</p>
        </div>
        <div className="rounded-control bg-shade/20 px-3 py-2">
          <p className="text-white/70">
            {t('adminSadaqah.method', 'Method')} · {t('adminSadaqah.date', 'Date')}
          </p>
          <p className="text-white font-bold">
            {donation.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} ·{' '}
            {donation.transactionDate.slice(0, 10)}
          </p>
        </div>
      </div>

      {donation.message && (
        <p className="text-white/70 text-xs italic border-l-2 border-brand-border pl-3">
          {donation.message}
        </p>
      )}

      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button onClick={() => startAction('verified')} className={`${BTN_PRIMARY} flex-1`}>
            {t('adminSadaqah.verify', 'Verify')}
          </button>
          <button onClick={() => startAction('rejected')} className={`${BTN_DANGER} flex-1`}>
            {t('adminSadaqah.reject', 'Reject')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-white/70 text-xs">
            {t(
              'adminSadaqah.emailEditableNote',
              'Prefilled: edit anything before sending. This is exactly what the donor receives.'
            )}
          </p>
          {draft.isPending ? (
            <p className="text-white/70 text-sm">{t('common.loading', 'Loading…')}</p>
          ) : (
            <textarea
              // eslint-disable-next-line jsx-a11y-x/no-autofocus -- appears after the admin asks to edit the email
              autoFocus
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={8}
              className={`textarea textarea-bordered w-full text-white text-sm leading-relaxed ${
                mode === 'rejected'
                  ? 'bg-brand-surface/50 border-red-400/20'
                  : 'bg-brand-surface/50 border-brand-emerald/20'
              }`}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={!emailText.trim() || sending || draft.isPending}
              className={`${mode === 'rejected' ? `${BTN_DANGER} !text-sm !py-2.5` : BTN_PRIMARY} flex-1`}
            >
              {sending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : mode === 'rejected' ? (
                t('adminSadaqah.sendReject', 'Send rejection email')
              ) : (
                t('adminSadaqah.sendVerify', 'Send verification email')
              )}
            </button>
            <button onClick={cancel} className={BTN_SMALL}>
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
