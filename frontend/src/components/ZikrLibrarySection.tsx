import { useEffect, useMemo, useState, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronDownIcon,
  TrashIcon,
  PencilSquareIcon,
  SpeakerWaveIcon,
  StopIcon,
  SparklesIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { COMMUNITY_ICON, ZIKR_CATEGORY_ICON } from './zikr/zikrCategoryIcons.js';
import { useTranslation } from 'react-i18next';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAddZikrType, useDeleteZikrType, useZikrTypes } from '../hooks/useZikrTypes.js';
import {
  useGlobalZikrLibrary,
  type GlobalZikrCategory,
  type GlobalZikrLibraryItem,
} from '../hooks/useZikrRequests.js';
import {
  ZIKR_LIBRARY,
  PREDEFINED_TYPES,
  LEGACY_LIBRARY_NAMES,
  LEGACY_NAME_ALIASES,
  zikrDisplayName,
  type LibraryZikr,
} from '../utils/zikrLibrary.js';
import { hasZikrAudio, getZikrAudioUrl } from '../utils/zikrAudio.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import ConfirmDialog from './ConfirmDialog.js';
import EditZikrModal from './EditZikrModal.js';
import ZikrSuggestForm from './ZikrSuggestForm.js';

/**
 * 📿 The zikr library (Istiak's plan) — a curated, categorized, hadith-
 * verified collection in Settings. Users add what they want to their OWN
 * counter list; the database defaults stay untouched. Custom adhkār get the
 * same full form as the counter's add modal (arabic/meaning/reference) and
 * can be edited afterwards — including renaming.
 */

/** Category label/emoji lookup for the community-suggested library, reusing
 * the curated ZIKR_LIBRARY's own category metadata so both lists present the
 * same taxonomy — plus an explicit 'uncategorized' bucket for admin-approved
 * items that were never assigned one. */
const COMMUNITY_CATEGORY_META: Record<
  GlobalZikrCategory,
  { emoji: string; title: string; titleBn?: string }
> = {
  ...Object.fromEntries(
    ZIKR_LIBRARY.map((c) => [c.id, { emoji: c.emoji, title: c.title, titleBn: c.titleBn }])
  ),
  uncategorized: { emoji: '', title: 'Uncategorized' },
} as Record<GlobalZikrCategory, { emoji: string; title: string; titleBn?: string }>;

const COMMUNITY_CATEGORY_ORDER: GlobalZikrCategory[] = [
  'tasbih',
  'istighfar',
  'salawat',
  'kalimat',
  'asma',
  'protection',
  'uncategorized',
];

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
      className={`shrink-0 w-7 h-7 rounded-full grid place-items-center border transition-colors ${
        playing
          ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
          : 'bg-brand-surface/60 border-brand-border text-white/70 hover:text-brand-gold hover:border-brand-gold/40'
      }`}
      title={t('zikrLibrary.previewAudio', 'Listen')}
      aria-label={t('zikrLibrary.previewAudio', 'Listen')}
    >
      {playing ? <StopIcon className="w-3.5 h-3.5" /> : <SpeakerWaveIcon className="w-3.5 h-3.5" />}
    </button>
  );
}

function CategoryIcon({ id, small = false }: { id: string; small?: boolean }) {
  const Icon = ZIKR_CATEGORY_ICON[id as GlobalZikrCategory] ?? ZIKR_CATEGORY_ICON.uncategorized;
  return <Icon className={`${small ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-brand-emerald shrink-0`} />;
}

export default function ZikrLibrarySection() {
  const { t, i18n } = useTranslation();
  const { types, setTypes, setCustomMeaning, removeType } = useZikrStore();
  const addZikrType = useAddZikrType();
  const deleteZikrType = useDeleteZikrType();
  const { data: fetchedTypes } = useZikrTypes();
  const { data: globalLibraryItems } = useGlobalZikrLibrary();
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

  const inList = (name: string) =>
    types.some((n) => {
      const lower = n.toLowerCase();
      return (
        lower === name.toLowerCase() ||
        LEGACY_NAME_ALIASES[lower]?.toLowerCase() === name.toLowerCase()
      );
    });

  // Group the admin-approved community library by category (falling back to
  // an explicit "Uncategorized" bucket) instead of one flat list, matching
  // the curated library's own categorized presentation.
  const groupedGlobalItems = useMemo(() => {
    const groups = new Map<GlobalZikrCategory, GlobalZikrLibraryItem[]>();
    for (const item of globalLibraryItems ?? []) {
      const key = item.category ?? 'uncategorized';
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return COMMUNITY_CATEGORY_ORDER.map((cat) => ({ cat, items: groups.get(cat) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [globalLibraryItems]);

  // Scroll-and-highlight a community item when the URL hash points at it —
  // makes the approved-request email's library link land somewhere real.
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  useEffect(() => {
    const hash = window.location.hash;
    const match = /^#zikr-lib-([a-f0-9]{24})$/.exec(hash);
    if (!match || !globalLibraryItems?.some((i) => i._id === match[1])) return;
    const targetId = match[1];
    setOpenCat('community');
    setHighlightedItem(targetId);
    const timer = setTimeout(() => {
      document.getElementById(`zikr-lib-${targetId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 300);
    const clearHighlight = setTimeout(() => setHighlightedItem(null), 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(clearHighlight);
    };
  }, [globalLibraryItems]);

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
        toast.error(t('zikrLibrary.removeFail', 'Could not remove. Please try again.'), {
          id: 'lib-del',
        }),
    });
    toast.success(t('zikrLibrary.removed', '"{{name}}" removed', { name }), {
      id: 'lib-del',
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
          t('zikrLibrary.added', '"{{name}}" added to your counter', {
            name: zikrDisplayName(item.name, i18n.language),
          }),
          { id: 'lib-add' }
        );
        setAdding(null);
      },
      onError: () => {
        toast.error(t('zikrLibrary.addFail', 'Could not add. Please try again.'), {
          id: 'lib-add',
        });
        setAdding(null);
      },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-white/70 text-xs leading-relaxed">
        {t(
          'zikrLibrary.intro',
          "Add any of these to your counter's dropdown. Every reference is verified, and your existing list stays exactly as it is."
        )}
      </p>

      {ZIKR_LIBRARY.map((cat) => (
        <div
          key={cat.id}
          id={`zikr-cat-${cat.id}`}
          className="rounded-control border border-brand-border bg-brand-surface/50 overflow-hidden"
        >
          <button
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left"
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
            <span className="flex items-center gap-2 text-white text-sm font-bold">
              <CategoryIcon id={cat.id} />
              <span>
                <bdi>{i18n.language === 'bn' && cat.titleBn ? cat.titleBn : cat.title}</bdi>
                <span className="text-white/60 font-normal">
                  {' '}
                  · {formatLocaleNumber(cat.items.length)}
                </span>
              </span>
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 shrink-0 text-white/60 transition-transform ${openCat === cat.id ? 'rotate-180' : ''}`}
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
                  <p className="text-white/70 text-[11px] italic">
                    {i18n.language === 'bn' && cat.blurbBn ? cat.blurbBn : cat.blurb}
                  </p>
                  {cat.items.map((item) => {
                    const added = inList(item.name);
                    return (
                      <div
                        key={item.name}
                        className="rounded-control bg-brand-deep border border-brand-border shadow-elev-1 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold flex items-center gap-1.5">
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
                              className="text-brand-emerald font-serif text-base leading-loose mt-0.5"
                            >
                              {item.arabic}
                            </p>
                            <p className="text-white/75 text-[11px] mt-1 leading-relaxed">
                              {i18n.language === 'bn' && item.meaningBn
                                ? item.meaningBn
                                : item.meaning}
                            </p>
                            {item.virtue && (
                              <p className="flex items-start gap-1 text-brand-gold text-[11px] mt-1 leading-relaxed">
                                <SparklesIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
                                {i18n.language === 'bn' && item.virtueBn
                                  ? item.virtueBn
                                  : item.virtue}
                              </p>
                            )}
                            <a
                              className="inline-block mt-1 text-brand-gold text-[11px] underline underline-offset-2"
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
                            className={`inline-flex items-center gap-1 rounded-control border px-2.5 py-1.5 text-xs font-bold shrink-0 transition-colors ${added ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color cursor-default' : 'bg-brand-surface/60 border-brand-border text-white/85 hover:border-brand-emerald/50 hover:text-white'}`}
                            disabled={added || adding === item.name}
                            onClick={() => addFromLibrary(item)}
                          >
                            {added ? (
                              <>
                                <CheckIcon className="w-3.5 h-3.5" />
                                {t('zikrLibrary.inList', 'In your list')}
                              </>
                            ) : adding === item.name ? (
                              '…'
                            ) : (
                              <>
                                <PlusIcon className="w-3.5 h-3.5" />
                                {t('zikrLibrary.addToList', 'Add to list')}
                              </>
                            )}
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
          className="rounded-control border border-brand-border bg-brand-surface/50 overflow-hidden"
        >
          <button
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left"
            onClick={() => setOpenCat(openCat === 'community' ? null : 'community')}
            aria-expanded={openCat === 'community'}
          >
            <span className="flex items-center gap-2 text-white text-sm font-bold">
              <COMMUNITY_ICON className="w-4 h-4 text-brand-emerald shrink-0" />
              <span>
                {t('zikrLibrary.communityTitle', 'Community-suggested')}
                <span className="text-white/60 font-normal">
                  {' '}
                  · {formatLocaleNumber(globalLibraryItems.length)}
                </span>
              </span>
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 shrink-0 text-white/60 transition-transform ${openCat === 'community' ? 'rotate-180' : ''}`}
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
                <div className="px-4 pb-3 space-y-3">
                  <p className="text-white/70 text-[11px] italic">
                    {t(
                      'zikrLibrary.communityBlurb',
                      'Suggested by the community and verified by our team.'
                    )}
                  </p>
                  {groupedGlobalItems.map(({ cat, items }) => {
                    const meta = COMMUNITY_CATEGORY_META[cat];
                    return (
                      <div key={cat} className="space-y-2">
                        <p className="flex items-center gap-1.5 text-white/80 text-[11px] font-bold">
                          <CategoryIcon id={cat} small />
                          {i18n.language === 'bn' && meta.titleBn ? meta.titleBn : meta.title}
                        </p>
                        {items.map((item) => {
                          const added = inList(item.name);
                          const isHighlighted = highlightedItem === item._id;
                          return (
                            <div
                              key={item._id}
                              id={`zikr-lib-${item._id}`}
                              className={`rounded-control bg-brand-deep border shadow-elev-1 p-3 transition-colors ${
                                isHighlighted
                                  ? 'border-brand-gold/60 ring-2 ring-brand-gold/30'
                                  : 'border-brand-border'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-bold flex items-center gap-1.5">
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
                                    className="text-brand-emerald font-serif text-base leading-loose mt-0.5"
                                  >
                                    {item.arabic}
                                  </p>
                                  <p className="text-white/75 text-[11px] mt-1 leading-relaxed">
                                    {item.meaning}
                                  </p>
                                  {item.virtue && (
                                    <p className="flex items-start gap-1 text-brand-gold text-[11px] mt-1 leading-relaxed">
                                      <SparklesIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
                                      {item.virtue}
                                    </p>
                                  )}
                                  <a
                                    className="inline-block mt-1 text-brand-gold text-[11px] underline underline-offset-2"
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {item.source}
                                    {item.grade ? ` · ${item.grade}` : ''}
                                  </a>
                                </div>
                                <button
                                  className={`inline-flex items-center gap-1 rounded-control border px-2.5 py-1.5 text-xs font-bold shrink-0 transition-colors ${added ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color cursor-default' : 'bg-brand-surface/60 border-brand-border text-white/85 hover:border-brand-emerald/50 hover:text-white'}`}
                                  disabled={added || adding === item.name}
                                  onClick={() => addFromLibrary(item)}
                                >
                                  {added ? (
                                    <>
                                      <CheckIcon className="w-3.5 h-3.5" />
                                      {t('zikrLibrary.inList', 'In your list')}
                                    </>
                                  ) : adding === item.name ? (
                                    '…'
                                  ) : (
                                    <>
                                      <PlusIcon className="w-3.5 h-3.5" />
                                      {t('zikrLibrary.addToList', 'Add to list')}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
      <div className="rounded-control border border-brand-border bg-brand-surface/50 p-4">
        <ZikrSuggestForm />

        {/* Your own custom tracker labels (from the counter's "+" add) —
            personal to your counter, unrelated to the shared library above. */}
        {customTypes.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-white/80 text-[11px] font-bold">
              {t('zikrLibrary.customAdditions', 'Your custom additions')}
            </p>
            {customTypes.map((name) => (
              <div
                key={name}
                className="flex items-center gap-1.5 rounded-control bg-brand-deep border border-brand-border px-3 py-2"
              >
                <span className="flex-1 min-w-0 truncate text-white text-xs">{name}</span>
                <button
                  onClick={() => setEditZikr(name)}
                  aria-label={t('zikrLibrary.editAria', 'Edit {{name}}', { name })}
                  className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-bold text-brand-emerald hover:bg-brand-emerald/10 shrink-0 transition-colors"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  {t('zikrLibrary.edit', 'Edit')}
                </button>
                <button
                  onClick={() => setConfirmDelete(name)}
                  aria-label={t('zikrLibrary.deleteAria', 'Delete {{name}}', { name })}
                  className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-500/10 shrink-0 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  {t('zikrLibrary.delete', 'Delete')}
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
          "This removes your custom zikr from the list and the server. Curated library items can't be deleted, only added or left out."
        )}
        confirmLabel={t('zikrLibrary.yesDelete', 'Yes, delete')}
        onConfirm={() => confirmDelete && deleteCustom(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <EditZikrModal name={editZikr} onClose={() => setEditZikr(null)} />
    </div>
  );
}
