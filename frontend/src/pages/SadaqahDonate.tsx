import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import BackButton from '../components/BackButton.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useSadaqahFormStore } from '../store/useSadaqahFormStore.js';
import { useSadaqahConfig, useSubmitDonation } from '../hooks/useSadaqah.js';

const PHONE_RE = /^01[3-9]\d{8}$/;

export default function SadaqahDonate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: config } = useSadaqahConfig();
  const submitMutation = useSubmitDonation();
  const [error, setError] = useState<string | null>(null);

  const {
    donorName,
    onBehalfOf,
    email,
    phone,
    paymentMethod,
    transactionId,
    amount,
    transactionDate,
    message,
    showNamePublicly,
    isAnonymous,
    setField,
    reset,
  } = useSadaqahFormStore();

  // Autofill once when the signed-in user resolves — re-running on every
  // keystroke would fight the donor's own edits to these fields.
  useEffect(() => {
    if (user?.displayName && !donorName) setField('donorName', user.displayName);
    if (user?.email && !email) setField('email', user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autofill once when user resolves; re-running on every keystroke would fight the donor's own edits
  }, [user]);

  const phoneValid = PHONE_RE.test(phone.trim());
  const amountNum = Number(amount);
  const amountValid = Number.isInteger(amountNum) && amountNum >= 10 && amountNum <= 25_000;
  const nameValid = isAnonymous || donorName.trim().length > 0;
  const canSubmit =
    nameValid &&
    !!email.trim() &&
    phoneValid &&
    transactionId.trim().length >= 4 &&
    amountValid &&
    !!transactionDate &&
    !submitMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await submitMutation.mutateAsync({
        donorName: isAnonymous ? undefined : donorName.trim(),
        onBehalfOf: onBehalfOf.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        paymentMethod,
        transactionId: transactionId.trim(),
        amount: amountNum,
        transactionDate,
        message: message.trim() || undefined,
        showNamePublicly: isAnonymous ? false : showNamePublicly,
        isAnonymous,
      });
      reset();
      navigate('/sadaqah/thank-you');
    } catch (err) {
      const serverMessage = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setError(
        serverMessage ??
          t(
            'sadaqahDonate.submitFail',
            'Could not submit right now — please check your connection and try again.'
          )
      );
    }
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('sadaqahDonate.seoTitle', 'Give Sadaqah')}
        description={t(
          'sadaqahDonate.seoDescription',
          'Submit your bKash sadaqah to Bustandeen — verified within 24-48 hours.'
        )}
        path="/sadaqah/donate"
        index={false}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-5">
        <BackButton to="/sadaqah" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-brand-gold/25 bg-brand-gold/5 p-5 space-y-2"
        >
          <p className="text-brand-gold font-black text-sm uppercase tracking-widest">
            {t('sadaqahDonate.howLabel', 'How to give')}
          </p>
          <ol className="text-white/70 text-sm leading-relaxed list-decimal list-inside space-y-1">
            <li>{t('sadaqahDonate.step1', 'Open bKash and choose Send Money (not Payment).')}</li>
            <li>
              {t('sadaqahDonate.step2', 'Send your amount to')}{' '}
              {config?.bkashNumber ? (
                <span className="text-white font-black">{config.bkashNumber}</span>
              ) : (
                <span className="text-white/40">
                  {t('sadaqahDonate.numberLoading', 'loading…')}
                </span>
              )}
            </li>
            <li>
              {t('sadaqahDonate.step3', "Copy the Transaction ID from bKash's confirmation SMS.")}
            </li>
            <li>{t('sadaqahDonate.step4', 'Fill in the form below with that ID and amount.')}</li>
          </ol>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-3xl border border-brand-border bg-brand-surface p-5 sm:p-7 space-y-5"
        >
          {/* Payment method — bKash only for now, Nagad scaffolded-disabled */}
          <div>
            <label className="text-white/70 text-sm font-bold">
              {t('sadaqahDonate.methodLabel', 'Payment method')}
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div className="rounded-2xl border-2 border-brand-emerald bg-brand-emerald/10 p-3 text-center">
                <p className="font-bold text-white text-sm">bKash</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-center opacity-40">
                <p className="font-bold text-white/50 text-sm">Nagad</p>
                <p className="text-[10px] text-white/30">
                  {t('sadaqahDonate.comingSoon', 'Coming soon')}
                </p>
              </div>
            </div>
          </div>

          {/* Anonymous + name */}
          <div className="flex items-center gap-2">
            <input
              id="sd-anon"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => {
                setField('isAnonymous', e.target.checked);
                if (e.target.checked) setField('showNamePublicly', false);
              }}
              className="checkbox checkbox-sm border-brand-emerald/40"
            />
            <label htmlFor="sd-anon" className="text-white/70 text-sm">
              {t('sadaqahDonate.anonymousLabel', "Don't record my name at all")}
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-name">
                {t('sadaqahDonate.nameLabel', 'Your name')}{' '}
                {!isAnonymous && <span className="text-red-400">*</span>}
              </label>
              <input
                id="sd-name"
                type="text"
                disabled={isAnonymous}
                value={isAnonymous ? '' : donorName}
                onChange={(e) => setField('donorName', e.target.value)}
                placeholder={t('sadaqahDonate.namePlaceholder', 'e.g. Abdullah')}
                className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white disabled:opacity-40"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-behalf">
                {t('sadaqahDonate.onBehalfLabel', 'On behalf of (optional)')}
              </label>
              <input
                id="sd-behalf"
                type="text"
                value={onBehalfOf}
                onChange={(e) => setField('onBehalfOf', e.target.value)}
                placeholder={t('sadaqahDonate.onBehalfPlaceholder', 'e.g. my late father')}
                className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-email">
                {t('sadaqahDonate.emailLabel', 'Email')} <span className="text-red-400">*</span>
              </label>
              <input
                id="sd-email"
                type="email"
                required
                value={email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="you@example.com"
                className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-phone">
                {t('sadaqahDonate.phoneLabel', 'bKash number you sent from')}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                id="sd-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="01XXXXXXXXX"
                className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white"
              />
              {!!phone && !phoneValid && (
                <p className="text-brand-gold/70 text-xs mt-1">
                  {t('sadaqahDonate.phoneHint', 'Enter an 11-digit Bangladeshi mobile number')}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-trxid">
                {t('sadaqahDonate.trxIdLabel', 'Transaction ID')}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                id="sd-trxid"
                type="text"
                required
                value={transactionId}
                onChange={(e) => setField('transactionId', e.target.value)}
                placeholder={t('sadaqahDonate.trxIdPlaceholder', 'From your bKash SMS')}
                className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-amount">
                {t('sadaqahDonate.amountLabel', 'Amount (BDT)')}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                id="sd-amount"
                type="number"
                required
                min={10}
                max={25000}
                step={1}
                value={amount}
                onChange={(e) => setField('amount', e.target.value)}
                placeholder="500"
                className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-sm font-bold" htmlFor="sd-date">
              {t('sadaqahDonate.dateLabel', 'Transaction date')}{' '}
              <span className="text-red-400">*</span>
            </label>
            <input
              id="sd-date"
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setField('transactionDate', e.target.value)}
              className="input input-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white max-w-[200px]"
            />
          </div>

          <div>
            <div className="flex items-end justify-between">
              <label className="text-white/70 text-sm font-bold" htmlFor="sd-message">
                {t('sadaqahDonate.messageLabel', 'Message (optional)')}
              </label>
              <span className="text-[11px] text-white/25">
                {t('sadaqahDonate.charCount', '{{count}} characters', { count: message.length })}
              </span>
            </div>
            <textarea
              id="sd-message"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setField('message', e.target.value)}
              placeholder={t(
                'sadaqahDonate.messagePlaceholder',
                'A du’a, a note, anything you’d like to add'
              )}
              className="textarea textarea-bordered w-full mt-1.5 bg-white/5 border-brand-emerald/15 text-white leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sd-public"
              type="checkbox"
              checked={!isAnonymous && showNamePublicly}
              disabled={isAnonymous}
              onChange={(e) => setField('showNamePublicly', e.target.checked)}
              className="checkbox checkbox-sm border-brand-emerald/40"
            />
            <label htmlFor="sd-public" className="text-white/70 text-sm disabled:opacity-40">
              {t('sadaqahDonate.showPubliclyLabel', 'Show my name publicly (default: private)')}
            </label>
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
            disabled={!canSubmit}
            className="w-full btn h-12 rounded-2xl border-0 text-white font-black bg-gradient-to-r from-brand-emerald via-brand-emerald to-brand-emerald-dim hover:opacity-90 disabled:opacity-40 gap-2"
          >
            {submitMutation.isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              '🤲'
            )}
            {submitMutation.isPending
              ? t('sadaqahDonate.sending', 'Submitting…')
              : t('sadaqahDonate.submitLabel', 'Submit')}
          </motion.button>
          <p className="text-white/25 text-[11px] text-center">
            {t(
              'sadaqahDonate.disclaimer',
              'Once submitted, we will verify against our bKash records within 24-48 hours. May Allah accept.'
            )}
          </p>
        </motion.form>
      </div>
    </AnimatedBackground>
  );
}
