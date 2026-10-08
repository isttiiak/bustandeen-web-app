import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BTN_PRIMARY, BTN_SECONDARY } from './bustanStyles.js';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useZikrStore } from '../store/useZikrStore.js';
import { useRenameZikrType } from '../hooks/useZikrTypes.js';
import ArabicKeyboard from './ArabicKeyboard.js';

/**
 * Edit a CUSTOM zikr — title (server rename carries lifetime + daily counts
 * over), Arabic, meaning and reference. Used from the counter's manage modal
 * and the Settings library. Curated/predefined entries are not editable.
 */
export default function EditZikrModal({
  name,
  onClose,
}: {
  name: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { customMeanings, setCustomMeaning, renameType } = useZikrStore();
  const renameZikrType = useRenameZikrType();

  const [title, setTitle] = useState('');
  const [arabic, setArabic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [translit, setTranslit] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showArabicKb, setShowArabicKb] = useState(false);

  // Prefill whenever a zikr is opened
  useEffect(() => {
    if (!name) return;
    const m = customMeanings[name];
    setTitle(name);
    setArabic(m?.arabic ?? '');
    setMeaning(m?.meaning ?? '');
    setTranslit(m?.transliteration ?? '');
    setSource(m?.source ?? '');
    setSourceUrl(m?.sourceUrl ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [name]);

  const save = async () => {
    if (!name || saving) return;
    const newName = title.trim();
    if (!newName) {
      toast.error(t('editZikr.titleRequired'));
      return;
    }
    if (newName.includes('.') || newName.startsWith('$')) {
      toast.error(t('editZikr.titleInvalid'));
      return;
    }
    setSaving(true);
    try {
      if (newName !== name) {
        // Server first — if the rename fails (409 duplicate etc.) nothing moves locally.
        await renameZikrType.mutateAsync({ oldName: name, newName });
        renameType(name, newName);
      }
      setCustomMeaning(newName, {
        arabic: arabic.trim() || undefined,
        meaning: meaning.trim() || newName,
        transliteration: translit.trim() || undefined,
        source: source.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      toast.success(t('editZikr.updated'), { id: 'zikr-edit' });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? t('editZikr.saveFailed'), { id: 'zikr-edit' });
    } finally {
      setSaving(false);
    }
  };

  // Portaled: page ancestors create stacking contexts that let the sticky
  // navbar float over in-tree modals.
  return createPortal(
    <AnimatePresence>
      {name && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('editZikr.title')}
            className="bg-brand-deep rounded-card p-6 w-full max-w-md shadow-elev-3 border border-brand-border max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-display text-xl font-bold text-white mb-1">
              {t('editZikr.title')}
            </h3>
            <p className="text-white/70 text-xs mb-4 leading-relaxed">{t('editZikr.renameHint')}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/80 font-bold mb-1 block">
                  {t('editZikr.labelTitle')} <span className="text-red-400">*</span>
                </label>
                <input
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-white/80 font-bold block">
                    {t('editZikr.labelArabic')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowArabicKb((v) => !v)}
                    className="text-[11px] font-bold text-brand-emerald hover:brightness-110 underline underline-offset-2"
                  >
                    {t('zikr.arabicKeyboard', 'Arabic keyboard')}
                  </button>
                </div>
                <input
                  value={arabic}
                  dir="rtl"
                  onChange={(e) => setArabic(e.target.value)}
                  className="w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald text-base"
                  style={{ fontFamily: "'Amiri', serif" }}
                />
                {showArabicKb && (
                  <ArabicKeyboard
                    value={arabic}
                    onChange={setArabic}
                    onClose={() => setShowArabicKb(false)}
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-white/80 font-bold mb-1 block">
                  {t('editZikr.labelPronunciation')}
                </label>
                <input
                  value={translit}
                  onChange={(e) => setTranslit(e.target.value)}
                  placeholder="Astaghfiru-llāh"
                  className="w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald text-sm italic"
                />
              </div>
              <div>
                <label className="text-xs text-white/80 font-bold mb-1 block">
                  {t('editZikr.labelMeaning')}
                </label>
                <input
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  className="w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald text-sm"
                />
              </div>
              <div className="border-t border-brand-border pt-3 space-y-2">
                <p className="text-white/80 text-xs font-bold">
                  {t('editZikr.labelReference')}{' '}
                  <span className="font-normal text-white/60">({t('common.optional')})</span>
                </p>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Ṣaḥīḥ Muslim 2702"
                  className="w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald text-xs"
                />
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://sunnah.com/..."
                  className="w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className={`${BTN_SECONDARY} flex-1`}>
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void save()}
                disabled={!title.trim() || saving}
                className={`${BTN_PRIMARY} flex-1`}
              >
                {saving ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  t('common.save')
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
