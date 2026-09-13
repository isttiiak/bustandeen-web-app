import { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronDownIcon,
  TrashIcon,
  PencilSquareIcon,
  SpeakerWaveIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAddZikrType, useDeleteZikrType, useZikrTypes } from '../hooks/useZikrTypes.js';
import { useSubmitZikrRequest, useGlobalZikrLibrary } from '../hooks/useZikrRequests.js';
import {
  ZIKR_LIBRARY,
  PREDEFINED_TYPES,
  LEGACY_LIBRARY_NAMES,
  zikrDisplayName,
  type LibraryZikr,
} from '../utils/zikrLibrary.js';
import { hasZikrAudio, getZikrAudioUrl } from '../utils/zikrAudio.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import ConfirmDialog from './ConfirmDialog.js';
import EditZikrModal from './EditZikrModal.js';

/**
 * 📿 The zikr library (Istiak's plan) — a curated, categorized, hadith-
 * verified collection in Settings. Users add what they want to their OWN
 * counter list; the database defaults stay untouched. Custom adhkār get the
 * same full form as the counter's add modal (arabic/meaning/reference) and
 * can be edited afterwards — including renaming.
 */

/** Names that belong to the app (curated catalog + counter predefined +
 * legacy renamed entries) — everything else on the server is user-custom. */
const APP_OWNED_NAMES = new Set(
  [
    ...ZIKR_LIBRARY.flatMap((c) => c.items.map((i) => i.name)),
    ...PREDEFINED_TYPES,
    ...LEGACY_LIBRARY_NAMES,
  ].map((n) => n.toLowerCase())
);

/** Small speaker/stop control shared by curated and community-library rows —
 * a preview only (doesn't touch the counter's own audio/auto-play state). */
function AudioPreviewButton({
  name,
  playing,
  onToggle,
}: {
  name: string;
  playing: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  if (!hasZikrAudio(name)) return null;
  return (
    <button
      onClick={onToggle}
      className={`shrink-0 w-6 h-6 rounded-full grid place-items-center border transition-colors ${
        playing
          ? 'bg-brand-gold/30 border-brand-gold/60 text-brand-gold'
          : 'bg-white/5 border-brand-emerald/20 text-white/50 hover:text-brand-gold hover:border-brand-gold/40'
      }`}
      title={t('zikrLibrary.previewAudio', 'Listen')}
      aria-label={t('zikrLibrary.previewAudio', 'Listen')}
    >
      {playing ? <StopIcon className="w-3.5 h-3.5" /> : <SpeakerWaveIcon className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ZikrLibrarySection() {
  const { t, i18n } = useTranslation();
  const { types, setTypes, setCustomMeaning, removeType } = useZikrStore();
  const addZikrType = useAddZikrType();
  const deleteZikrType = useDeleteZikrType();
  const { data: fetchedTypes } = useZikrTypes();
  const { data: globalLibraryItems } = useGlobalZikrLibrary();
  const submitZikrRequest = useSubmitZikrRequest();
  // Start fully collapsed — pre-opening 'salawat' made the section land
  // half-scrolled with one category already sprawling.
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editZikr, setEditZikr] = useState<string | null>(null);

  // One shared preview player — starting a new preview stops any other.
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const togglePreview = (name: string) => {
    if (previewPlaying === name) {
      previewAudioRef.current?.pause();
      setPreviewPlaying(null);
      return;
    }
    const url = getZikrAudioUrl(name);
    if (!url) return;
    if (!previewAudioRef.current) previewAudioRef.current = new Audio();
    const audio = previewAudioRef.current;
    audio.pause();
    audio.src = url;
    audio.currentTime = 0;
    audio.onended = () => setPreviewPlaying(null);
    void audio.play();
    setPreviewPlaying(name);
  };

  // Request-a-zikr form — same fields as before, but submits for admin
  // review instead of adding directly (see zikrRequest.service.ts).
  const [reqName, setReqName] = useState('');
  const [reqArabic, setReqArabic] = useState('');
  const [reqMeaning, setReqMeaning] = useState('');
  const [reqSource, setReqSource] = useState('');
  const [reqSourceUrl, setReqSourceUrl] = useState('');

  const inList = (name: string) => types.some((n) => n.toLowerCase() === name.toLowerCase());

  // "Custom" = server-stored types the user typed themselves — NOT the
  // counter's predefined defaults and NOT curated library items.
  const customTypes = useMemo(
    () =>
      (fetchedTypes ?? [])
        .map((ft) => ft.name)
        .filter((n): n is string => !!n && !APP_OWNED_NAMES.has(n.toLowerCase())),
    [fetchedTypes]
  );

  const deleteCustom = (name: string) => {
    removeType(name);
    deleteZikrType.mutate(name, {
      onError: () =>
        toast.error(t('zikrLibrary.removeFail', 'Could not remove — try again.'), {
          id: 'lib-del',
        }),
    });
    toast.success(t('zikrLibrary.removed', '"{{name}}" removed', { name }), {
      id: 'lib-del',
      icon: '🗑️',
    });
    setConfirmDelete(null);
  };

  const addFromLibrary = (item: LibraryZikr) => {
    if (inList(item.name)) return;
    setAdding(item.name);
    addZikrType.mutate(item.name, {
      onSuccess: () => {
        setTypes([...types, item.name]);
        setCustomMeaning(item.name, {
          arabic: item.shortArabic ?? item.arabic,
          meaning: item.shortMeaning ?? item.meaning,
          fullArabic: item.arabic,
          fullMeaning: item.meaning,
          source: item.source,
          sourceUrl: item.sourceUrl,
          grade: item.grade,
          virtue: item.virtue,
        });
        toast.success(
          t('zikrLibrary.added', '"{{name}}" added to your counter 📿', {
            name: zikrDisplayName(item.name, i18n.language),
          }),
          { id: 'lib-add' }
        );
        setAdding(null);
      },
      onError: () => {
        toast.error(t('zikrLibrary.addFail', 'Could not add — try again.'), { id: 'lib-add' });
        setAdding(null);
      },
    });
  };

  const submitRequest = () => {
    const name = reqName.trim();
    const meaning = reqMeaning.trim();
    if (!name || !meaning) return;
    submitZikrRequest.mutate(
      {
        name,
        arabic: reqArabic.trim() || undefined,
        meaning,
        source: reqSource.trim() || undefined,
        sourceUrl: reqSourceUrl.trim() || undefined,
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
          setReqName('');
          setReqArabic('');
          setReqMeaning('');
          setReqSource('');
          setReqSourceUrl('');
        },
        onError: () =>
          toast.error(t('zikrLibrary.requestFail', 'Could not submit — try again.'), {
            id: 'lib-request',
          }),
      }
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-xs leading-relaxed">
        {t(
          'zikrLibrary.intro',
          "Add any of these to your counter's dropdown — every reference is verified. Your existing list stays exactly as it is."
        )}
      </p>

      {ZIKR_LIBRARY.map((cat) => (
        <div
          key={cat.id}
          id={`zikr-cat-${cat.id}`}
          className="rounded-2xl border border-brand-emerald/10 bg-white/5 overflow-hidden"
        >
          <button
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            onClick={() => {
              const opening = openCat !== cat.id;
              setOpenCat(opening ? cat.id : null);
              // When another section collapses above, the page used to land at
              // the END of the newly expanded list — pin the header instead.
              if (opening) {
                setTimeout(() => {
                  document
                    .getElementById(`zikr-cat-${cat.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 280);
              }
            }}
            aria-expanded={openCat === cat.id}
          >
            <span className="text-white/80 text-sm font-bold">
              {cat.emoji} {i18n.language === 'bn' && cat.titleBn ? cat.titleBn : cat.title}
              <span className="text-white/25 font-normal">
                {' '}
                · {formatLocaleNumber(cat.items.length)}
              </span>
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 text-white/30 transition-transform ${openCat === cat.id ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {openCat === cat.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-white/30 text-[11px] italic">
                    {i18n.language === 'bn' && cat.blurbBn ? cat.blurbBn : cat.blurb}
                  </p>
                  {cat.items.map((item) => {
                    const added = inList(item.name);
                    return (
                      <div
                        key={item.name}
                        className="rounded-xl bg-white/5 border border-brand-emerald/10 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-sm font-bold flex items-center gap-1.5">
                              {zikrDisplayName(item.name, i18n.language)}
                              <AudioPreviewButton
                                name={item.name}
                                playing={previewPlaying === item.name}
                                onToggle={() => togglePreview(item.name)}
                              />
                            </p>
                            <p
                              dir="rtl"
                              lang="ar"
                              className="text-brand-emerald/80 font-serif text-base leading-loose mt-0.5"
                            >
                              {item.arabic}
                            </p>
                            <p className="text-white/40 text-[11px] mt-1 leading-relaxed">
                              {i18n.language === 'bn' && item.meaningBn
                                ? item.meaningBn
                                : item.meaning}
                            </p>
                            {item.virtue && (
                              <p className="text-brand-gold/60 text-[11px] mt-1 leading-relaxed">
                                ✨{' '}
                                {i18n.language === 'bn' && item.virtueBn
                                  ? item.virtueBn
                                  : item.virtue}
                              </p>
                            )}
                            <a
                              className="text-white/30 text-[10px] underline"
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {translateReference(item.source, i18n.language)}
                              {item.grade
                                ? ` · ${translateReference(item.grade, i18n.language)}`
                                : ''}
                            </a>
                          </div>
                          <button
                            className={`btn btn-xs rounded-lg shrink-0 ${added ? 'bg-brand-emerald border-brand-emerald text-white font-bold cursor-default !opacity-100' : 'bg-white/5 border-brand-emerald/20 text-white/70 hover:border-brand-emerald/50'}`}
                            disabled={added || adding === item.name}
                            onClick={() => addFromLibrary(item)}
                          >
                            {added
                              ? t('zikrLibrary.inList', '✓ In your list')
                              : adding === item.name
                                ? '…'
                                : t('zikrLibrary.addToList', '＋ Add to list')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Community-suggested additions — admin-verified via the request flow
          below, live-updated (no app redeploy needed for a new entry to appear). */}
      {globalLibraryItems && globalLibraryItems.length > 0 && (
        <div
          id="zikr-cat-community"
          className="rounded-2xl border border-brand-emerald/10 bg-white/5 overflow-hidden"
        >
          <button
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            onClick={() => setOpenCat(openCat === 'community' ? null : 'community')}
            aria-expanded={openCat === 'community'}
          >
            <span className="text-white/80 text-sm font-bold">
              🌱 {t('zikrLibrary.communityTitle', 'Community-suggested')}
              <span className="text-white/25 font-normal">
                {' '}
                · {formatLocaleNumber(globalLibraryItems.length)}
              </span>
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 text-white/30 transition-transform ${openCat === 'community' ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {openCat === 'community' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-white/30 text-[11px] italic">
                    {t(
                      'zikrLibrary.communityBlurb',
                      'Suggested by the community and verified by our team.'
                    )}
                  </p>
                  {globalLibraryItems.map((item) => {
                    const added = inList(item.name);
                    return (
                      <div
                        key={item._id}
                        className="rounded-xl bg-white/5 border border-brand-emerald/10 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-sm font-bold flex items-center gap-1.5">
                              {item.name}
                              <AudioPreviewButton
                                name={item.name}
                                playing={previewPlaying === item.name}
                                onToggle={() => togglePreview(item.name)}
                              />
                            </p>
                            <p
                              dir="rtl"
                              lang="ar"
                              className="text-brand-emerald/80 font-serif text-base leading-loose mt-0.5"
                            >
                              {item.arabic}
                            </p>
                            <p className="text-white/40 text-[11px] mt-1 leading-relaxed">
                              {item.meaning}
                            </p>
                            {item.virtue && (
                              <p className="text-brand-gold/60 text-[11px] mt-1 leading-relaxed">
                                ✨ {item.virtue}
                              </p>
                            )}
                            <a
                              className="text-white/30 text-[10px] underline"
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.source}
                              {item.grade ? ` · ${item.grade}` : ''}
                            </a>
                          </div>
                          <button
                            className={`btn btn-xs rounded-lg shrink-0 ${added ? 'bg-brand-emerald border-brand-emerald text-white font-bold cursor-default !opacity-100' : 'bg-white/5 border-brand-emerald/20 text-white/70 hover:border-brand-emerald/50'}`}
                            disabled={added || adding === item.name}
                            onClick={() => addFromLibrary(item)}
                          >
                            {added
                              ? t('zikrLibrary.inList', '✓ In your list')
                              : adding === item.name
                                ? '…'
                                : t('zikrLibrary.addToList', '＋ Add to list')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Request a new zikr — submitted for admin review, not added directly,
          so the library stays hadith-verified. */}
      <div className="rounded-2xl border border-brand-emerald/10 bg-white/5 p-4">
        <p className="text-white/60 text-xs font-bold mb-1">
          {t('zikrLibrary.requestOwn', '🌱 Suggest a zikr or dua')}
        </p>
        <p className="text-white/30 text-[11px] mb-3">
          {t(
            'zikrLibrary.requestOwnHint',
            'We review every suggestion against an authentic source before adding it — name and meaning are required, a reference helps us verify it faster.'
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
              'Meaning — e.g. My Lord, increase me in knowledge *'
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
          <button
            className="btn btn-sm w-full rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info"
            disabled={!reqName.trim() || !reqMeaning.trim() || submitZikrRequest.isPending}
            onClick={submitRequest}
          >
            {submitZikrRequest.isPending ? '…' : t('zikrLibrary.makeRequest', 'Make request')}
          </button>
        </div>

        {/* Your own custom tracker labels (from the counter's "+" add) —
            personal to your counter, unrelated to the shared library above. */}
        {customTypes.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-white/40 text-[11px] font-bold">
              {t('zikrLibrary.customAdditions', 'Your custom additions')}
            </p>
            {customTypes.map((name) => (
              <div
                key={name}
                className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-brand-emerald/10 px-3 py-2"
              >
                <span className="flex-1 min-w-0 truncate text-white/75 text-xs">{name}</span>
                <button
                  onClick={() => setEditZikr(name)}
                  aria-label={t('zikrLibrary.editAria', 'Edit {{name}}', { name })}
                  className="btn btn-xs btn-ghost text-brand-emerald/70 hover:text-brand-emerald hover:bg-brand-emerald/10 gap-1 shrink-0"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" /> {t('zikrLibrary.edit', 'Edit')}
                </button>
                <button
                  onClick={() => setConfirmDelete(name)}
                  aria-label={t('zikrLibrary.deleteAria', 'Delete {{name}}', { name })}
                  className="btn btn-xs btn-ghost text-red-400/60 hover:text-red-400 hover:bg-red-500/10 gap-1 shrink-0"
                >
                  <TrashIcon className="w-3.5 h-3.5" /> {t('zikrLibrary.delete', 'Delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('zikrLibrary.deleteConfirmTitle', 'Delete "{{name}}"?', {
          name: confirmDelete ?? '',
        })}
        message={t(
          'zikrLibrary.deleteConfirmMsg',
          "This removes your custom zikr from the list and the server. Curated library items can't be deleted — only added or left out."
        )}
        confirmLabel={t('zikrLibrary.yesDelete', 'Yes, delete')}
        onConfirm={() => confirmDelete && deleteCustom(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <EditZikrModal name={editZikr} onClose={() => setEditZikr(null)} />
    </div>
  );
}
