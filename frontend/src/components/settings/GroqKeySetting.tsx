import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircleIcon, KeyIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { useClearGroqKey, useGroqKeyStatus, useSetGroqKey } from '../../hooks/useAi.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { BTN_DANGER_QUIET, BTN_QUIET } from './settingsParts.js';

export function GroqKeySetting({ t }: { t: (key: string) => string }) {
  const { data, isLoading } = useGroqKeyStatus();
  const setKey = useSetGroqKey();
  const clearKey = useClearGroqKey();
  const [value, setValue] = useState('');
  // Distinct from "no key yet" — lets an existing key be replaced without
  // first tapping Remove (previously the only way to rotate a key at all).
  const [changing, setChanging] = useState(false);

  const hasOwnKey = data?.hasOwnKey ?? false;
  const setAt = data?.setAt ?? null;
  const showForm = !isLoading && (!hasOwnKey || changing);

  const handleSave = () => {
    const apiKey = value.trim();
    if (!apiKey) return;
    setKey.mutate(apiKey, {
      onSuccess: () => {
        setValue('');
        setChanging(false);
        // Longer duration + a stable id (react-hot-toast dedupes/replaces by
        // id) so a quick re-click can't stack duplicate toasts, and the
        // message has a real chance to be seen instead of a default 4s blip.
        toast.success(t('settings.groqKeySaved'), { id: 'groq-key', duration: 5000 });
      },
      onError: () => toast.error(t('settings.groqKeyInvalid'), { id: 'groq-key', duration: 6000 }),
    });
  };

  const handleRemove = () => {
    clearKey.mutate(undefined, {
      onSuccess: () => {
        setChanging(false);
        toast.success(t('settings.groqKeyRemoved'), { id: 'groq-key' });
      },
      onError: () => toast.error(t('settings.groqKeyInvalid'), { id: 'groq-key' }),
    });
  };

  return (
    <div className="p-3 rounded-control border border-brand-border bg-brand-surface/50 space-y-2">
      <div className="flex items-center gap-2">
        <KeyIcon className="w-4 h-4 text-brand-gold shrink-0" />
        <p className="font-semibold text-white text-sm">{t('settings.groqKeySection')}</p>
      </div>
      <p className="text-white/70 text-xs leading-snug">
        {t('settings.groqKeyDetail')}{' '}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-emerald underline"
        >
          {t('settings.groqKeyGetOne')}
        </a>
      </p>

      {!isLoading && hasOwnKey && !showForm && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-xs text-brand-emerald font-bold">
              <CheckCircleIcon className="w-4 h-4" />
              {t('settings.groqKeyActive')}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setChanging(true)} className={BTN_QUIET}>
                <PencilSquareIcon className="w-3.5 h-3.5" />
                {t('settings.groqKeyChange')}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={clearKey.isPending}
                className={BTN_DANGER_QUIET}
              >
                {t('settings.groqKeyRemove')}
              </button>
            </div>
          </div>
          {setAt && (
            <p className="text-white/70 text-[11px]">
              {t('settings.groqKeyAddedOn')}{' '}
              {formatLocaleDate(new Date(setAt), {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
          <p className="text-white/70 text-[11px]">{t('settings.groqKeySyncNote')}</p>
        </div>
      )}

      {showForm && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('settings.groqKeyPlaceholder')}
              autoComplete="off"
              className="flex-1 min-w-0 rounded-control border border-brand-border bg-shade/30 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!value.trim() || setKey.isPending}
              className="btn-solid inline-flex items-center justify-center rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 transition disabled:opacity-50"
            >
              {setKey.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('settings.groqKeySave')
              )}
            </button>
            {hasOwnKey && (
              <button
                type="button"
                onClick={() => {
                  setChanging(false);
                  setValue('');
                }}
                className={BTN_QUIET}
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
          <p className="text-white/70 text-[11px]">{t('settings.groqKeySyncNote')}</p>
        </div>
      )}
    </div>
  );
}
