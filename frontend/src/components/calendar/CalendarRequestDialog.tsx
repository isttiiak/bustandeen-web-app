import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY, DIALOG } from '../bustanStyles.js';
import { COUNTRY_CODES } from '../profile/profileParts.js';
import { countryName } from '../../utils/countryDefaults.js';
import { useCalendarRequest } from '../../hooks/useCalendarRequest.js';

/**
 * "Request your country's calendar": a small form over the Islamic calendar
 * (no trip to the Feedback page). The only field is the country; it reaches
 * the Feedback inbox under "Calendar request".
 */
export default function CalendarRequestDialog({
  open,
  onClose,
  country,
}: {
  open: boolean;
  onClose: () => void;
  /** The calendar's country (ISO code), chosen to start with. */
  country: string | null;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'bn' ? 'bn' : 'en';
  const [picked, setPicked] = useState(country ?? '');
  const [botcheck, setBotcheck] = useState('');
  const send = useCalendarRequest();
  const selectRef = useRef<HTMLSelectElement>(null);

  const options = useMemo(() => {
    const codes = new Set(Object.values(COUNTRY_CODES));
    if (country) codes.add(country);
    // Bangladesh already has its calendar.
    codes.delete('BD');
    return [...codes]
      .map((code) => ({ code, name: countryName(code, lang) }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }, [country, lang]);

  useEffect(() => {
    if (!open) return;
    setPicked(country && country !== 'BD' ? country : '');
    setBotcheck('');
    send.reset();
    selectRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // send.reset is stable enough; only reopen should reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, country]);

  useEffect(() => {
    if (!send.isSuccess) return;
    const id = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(id);
  }, [send.isSuccess, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4">
      <form
        className={`${DIALOG} w-full max-w-sm p-5 space-y-4`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-request-title"
        data-testid="calendar-request"
        onSubmit={(e) => {
          e.preventDefault();
          if (picked && !send.isPending && !send.isSuccess)
            send.mutate({ country: picked, botcheck });
        }}
      >
        <h2
          id="calendar-request-title"
          className="font-display text-lg font-bold text-white flex items-center gap-2"
        >
          <CalendarDaysIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
          {t('calendar.rTitle')}
        </h2>
        <p className="text-sm text-white/75 leading-relaxed">{t('calendar.rIntro')}</p>
        <label className="grid gap-1.5 text-sm font-semibold text-white">
          {t('calendar.rCountry')}
          <select
            ref={selectRef}
            required
            value={picked}
            disabled={send.isPending || send.isSuccess}
            onChange={(e) => setPicked(e.target.value)}
            className="min-h-[44px] rounded-control border border-brand-border bg-brand-surface px-2 text-sm font-semibold text-white"
          >
            <option value="" disabled>
              {t('calendar.rChoose')}
            </option>
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        {/* Honeypot: hidden from people, filled by bots, dropped by the server. */}
        <input
          type="text"
          name="botcheck"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={botcheck}
          onChange={(e) => setBotcheck(e.target.value)}
        />
        <p role="status" className="text-sm text-white/75 min-h-[1.25rem]">
          {send.isPending
            ? t('calendar.rSending')
            : send.isSuccess
              ? t('calendar.rSent')
              : send.isError
                ? t('calendar.rFailed')
                : ''}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            {send.isSuccess ? t('calendar.rClose') : t('calendar.nCancel')}
          </button>
          <button
            type="submit"
            disabled={!picked || send.isPending || send.isSuccess}
            className={`${BTN_PRIMARY} disabled:opacity-60`}
            data-testid="calendar-request-send"
          >
            {t('calendar.rSend')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
