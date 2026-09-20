import { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAddZikrType } from '../hooks/useZikrTypes.js';
import { useSubmitZikrRequest } from '../hooks/useZikrRequests.js';
import { LEGACY_NAME_ALIASES } from '../utils/zikrLibrary.js';

/**
 * The "suggest a zikr" form, shared by Settings and the counter's "+" modal so
 * both offer identical fields and the same two paths: request it for the
 * shared library (reviewed), or add it to this user's own list only (after a
 * consent step). `onDone` fires after either path succeeds.
 */
export default function ZikrSuggestForm({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const { types, setTypes, setCustomMeaning } = useZikrStore();
  const addZikrType = useAddZikrType();
  const submitZikrRequest = useSubmitZikrRequest();

  // Request-a-zikr form — same fields as before, but submits for admin
  // review instead of adding directly (see zikrRequest.service.ts).
  const [reqName, setReqName] = useState('');
  const [reqArabic, setReqArabic] = useState('');
  const [reqMeaning, setReqMeaning] = useState('');
  const [reqSource, setReqSource] = useState('');
  const [reqSourceUrl, setReqSourceUrl] = useState('');
  const [reqWantsAudio, setReqWantsAudio] = useState(false);
  // Own-list-only add is confirmed in a modal before anything is saved.
  const [showConsent, setShowConsent] = useState(false);

  const inList = (name: string) =>
    types.some((n) => {
      const lower = n.toLowerCase();
      return (
        lower === name.toLowerCase() ||
        LEGACY_NAME_ALIASES[lower]?.toLowerCase() === name.toLowerCase()
      );
    });

  const resetRequestForm = () => {
    setReqName('');
    setReqArabic('');
    setReqMeaning('');
    setReqSource('');
    setReqSourceUrl('');
    setReqWantsAudio(false);
  };

  // Personal-only add: never reviewed, never shared. The user has just
  // accepted responsibility for the wording in the consent modal.
  const addToOwnList = () => {
    const name = reqName.trim();
    if (!name) return;
    if (inList(name)) {
      toast.error(t('zikrLibrary.alreadyInList', 'Already in your list ✓'), { id: 'lib-add' });
      setShowConsent(false);
      return;
    }
    addZikrType.mutate(name, {
      onSuccess: () => {
        setTypes([...types, name]);
        setCustomMeaning(name, {
          arabic: reqArabic.trim() || undefined,
          meaning: reqMeaning.trim(),
          source: reqSource.trim() || undefined,
          sourceUrl: reqSourceUrl.trim() || undefined,
        });
        toast.success(t('zikrLibrary.addedOwn', '"{{name}}" added to your own list 📿', { name }), {
          id: 'lib-add',
        });
        resetRequestForm();
        setShowConsent(false);
        onDone?.();
      },
      onError: () => {
        toast.error(t('zikrLibrary.addFail', 'Could not add — try again.'), { id: 'lib-add' });
        setShowConsent(false);
      },
    });
  };

  // From the consent modal: send it for review instead of keeping it private.
  const requestFromConsent = () => {
    setShowConsent(false);
    submitRequest();
  };

  const submitRequest = () => {
    const name = reqName.trim();
    if (!name) return;
    submitZikrRequest.mutate(
      {
        name,
        arabic: reqArabic.trim() || undefined,
        meaning: reqMeaning.trim() || undefined,
        source: reqSource.trim() || undefined,
        sourceUrl: reqSourceUrl.trim() || undefined,
        wantsAudio: reqWantsAudio,
      },
      {
        onSuccess: () => {
          toast.success(
            t(
              'zikrLibrary.requestSubmitted',
              'Thank you — we’ll review "{{name}}" and add it soon, in shā’ Allāh. 🌱',
              { name }
            ),
            { id: 'lib-request', duration: 5000 }
          );
          resetRequestForm();
          onDone?.();
        },
        onError: () =>
          toast.error(t('zikrLibrary.requestFail', 'Could not submit — try again.'), {
            id: 'lib-request',
          }),
      }
    );
  };

  return (
    <>
      <p className="text-white/60 text-xs font-bold mb-1">
        {t('zikrLibrary.requestOwn', '🌱 Suggest a zikr or dua')}
      </p>
      <p className="text-white/30 text-[11px] mb-3">
        {t(
          'zikrLibrary.requestOwnHint',
          'Only the name is required — an Ansar will review it (with a scholar if needed) and fill in the rest before it joins the library. Anything else you can tell us helps verify it faster.'
        )}
      </p>
      <div className="space-y-2">
        <input
          type="text"
          placeholder={t('zikrLibrary.namePlaceholder', 'Name — e.g. Rabbi zidni ilma *')}
          aria-label={t('zikrLibrary.nameLabel', 'Zikr name')}
          className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          value={reqName}
          maxLength={100}
          onChange={(e) => setReqName(e.target.value)}
        />
        <input
          type="text"
          dir="rtl"
          placeholder={t('zikrLibrary.arabicPlaceholder', 'Arabic — رَبِّ زِدْنِي عِلْمًا')}
          aria-label={t('zikrLibrary.arabicLabel', 'Arabic text')}
          className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl font-serif"
          value={reqArabic}
          onChange={(e) => setReqArabic(e.target.value)}
        />
        <input
          type="text"
          placeholder={t(
            'zikrLibrary.meaningPlaceholder',
            'Meaning — e.g. My Lord, increase me in knowledge (optional)'
          )}
          aria-label={t('zikrLibrary.meaningLabel', 'Meaning')}
          className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          value={reqMeaning}
          onChange={(e) => setReqMeaning(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            placeholder={t('zikrLibrary.refPlaceholder', 'Reference — e.g. Quran 20:114')}
            aria-label={t('zikrLibrary.refLabel', 'Reference')}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl text-xs"
            value={reqSource}
            onChange={(e) => setReqSource(e.target.value)}
          />
          <input
            type="text"
            placeholder={t('zikrLibrary.linkPlaceholder', 'Link — https://quran.com/20/114')}
            aria-label={t('zikrLibrary.linkLabel', 'Reference link')}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl text-xs"
            value={reqSourceUrl}
            onChange={(e) => setReqSourceUrl(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-white/50 text-xs px-1">
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={reqWantsAudio}
            onChange={(e) => setReqWantsAudio(e.target.checked)}
          />
          {t('zikrLibrary.wantsAudio', "Want an audio recitation for this, if it's added?")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            className="btn btn-sm w-full rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info"
            disabled={!reqName.trim() || submitZikrRequest.isPending}
            onClick={submitRequest}
          >
            {submitZikrRequest.isPending
              ? '…'
              : t('zikrLibrary.makeRequest', 'Request for the library')}
          </button>
          <button
            className="btn btn-sm w-full rounded-xl bg-white/5 border-brand-emerald/25 text-white/80 hover:border-brand-emerald/50"
            disabled={!reqName.trim() || addZikrType.isPending}
            onClick={() => setShowConsent(true)}
          >
            {t('zikrLibrary.addOwnOnly', 'Add to my list only')}
          </button>
        </div>
        <p className="text-white/30 text-[11px] px-1">
          {t(
            'zikrLibrary.twoWaysHint',
            'The library request is reviewed and shared with everyone. "My list only" stays private to you and is not reviewed.'
          )}
        </p>
      </div>

      {showConsent &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setShowConsent(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-brand-deep border border-brand-border p-5 pt-6"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label={t('zikrLibrary.consentTitle', 'Before you add this')}
            >
              <button
                onClick={() => setShowConsent(false)}
                aria-label={t('common.close', 'Close')}
                className="absolute top-3 right-3 w-7 h-7 rounded-full grid place-items-center border border-red-500/70 text-red-400 hover:bg-red-500/10"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              <h3 className="text-white font-black text-base pr-8">
                {t('zikrLibrary.consentTitle', 'Before you add this')}
              </h3>
              <p className="text-white/60 text-xs mt-2 leading-relaxed">
                {t(
                  'zikrLibrary.consentBody',
                  '"{{name}}" will only be added to your own list. Nobody on our team will check its wording or source. If it is not a correct or authentic practice, that is your responsibility.',
                  { name: reqName.trim() }
                )}
              </p>
              <p className="text-white/40 text-xs mt-2 leading-relaxed">
                {t(
                  'zikrLibrary.consentAlt',
                  'You can send it to our team for review instead, and it may join the library for everyone.'
                )}
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <button
                  className="btn btn-sm rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info"
                  disabled={submitZikrRequest.isPending}
                  onClick={requestFromConsent}
                >
                  {t('zikrLibrary.consentRequest', 'Make request for review')}
                </button>
                <button
                  className="btn btn-sm rounded-xl bg-white/5 border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/10"
                  disabled={addZikrType.isPending}
                  onClick={addToOwnList}
                >
                  {addZikrType.isPending
                    ? '…'
                    : t('zikrLibrary.consentYes', 'Yes, add it, I take responsibility')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
