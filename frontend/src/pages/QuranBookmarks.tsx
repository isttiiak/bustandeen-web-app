import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import { useAuthStore } from '../store/useAuthStore.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import {
  useQuranSummary,
  useToggleBookmark,
  useToggleDuaBookmark,
  type QuranBookmark,
} from '../hooks/useQuran.js';
import {
  loadSurahList,
  loadSurahText,
  surahDisplayName,
  selectedTranslations,
  type SurahMeta,
  type AyahText,
} from '../utils/quranData.js';
import { translitEnabled } from '../utils/quranPrefs.js';
import { QURANIC_DUAS } from '../utils/quranMeta.js';
import ShareAyahModal from '../components/ShareAyahModal.js';
import { ShareIcon } from '@heroicons/react/24/outline';

/**
 * 🔖 Saved — a full tab of its own (Istiak's spec) with TWO sub-tabs:
 * āyāt (organized by surah, Arabic preview) and saved duʿās from the
 * curated list. Each entry opens straight in the reader.
 */
export default function QuranBookmarks() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: summary, isLoading } = useQuranSummary();
  const toggleBookmark = useToggleBookmark();
  const toggleDua = useToggleDuaBookmark();

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [texts, setTexts] = useState<Record<number, AyahText[]>>({});
  const [pendingRemove, setPendingRemove] = useState<QuranBookmark | null>(null);
  const [pendingRemoveDua, setPendingRemoveDua] = useState<string | null>(null);
  const [tab, setTab] = useState<'ayat' | 'duas'>('ayat');
  const [sharing, setSharing] = useState<QuranBookmark | null>(null);
  // Collapsed by default — a surah card shows only its saved count until
  // opened, so a long list (20 from al-Baqarah + 10 from al-Kahf + ...)
  // doesn't force scrolling past every earlier surah to reach the last one.
  const [openSurah, setOpenSurah] = useState<number | null>(null);

  const savedDuas = useMemo(
    () =>
      (summary?.profile.savedDuas ?? [])
        .map((id) => QURANIC_DUAS.find((d) => d.id === id))
        .filter((d): d is NonNullable<typeof d> => !!d),
    [summary]
  );

  const groups = useMemo(() => {
    const m = new Map<number, QuranBookmark[]>();
    for (const b of summary?.bookmarks ?? []) {
      const arr = m.get(b.surah) ?? [];
      arr.push(b);
      m.set(b.surah, arr);
    }
    return [...m.entries()]
      .map(([surah, items]) => ({ surah, items: items.sort((a, b) => a.ayah - b.ayah) }))
      .sort((a, b) => a.surah - b.surah);
  }, [summary]);

  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((l) => {
        if (alive) setSurahs(l);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Load the Arabic text only for the currently OPENED surah (cached per
  // surah once fetched) — collapsed cards need nothing but their count.
  useEffect(() => {
    if (openSurah == null || texts[openSurah]) return;
    let alive = true;
    loadSurahText(openSurah)
      .then((t) => {
        if (alive) setTexts((prev) => ({ ...prev, [openSurah]: t }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- texts intentionally omitted; it's only read, adding it would retrigger this on every fetch
  }, [openSurah]);

  const metaOf = (n: number) => surahs.find((s) => s.number === n);
  const ayahText = (surah: number, ayah: number) =>
    texts[surah]?.find((a) => a.numberInSurah === ayah);

  if (isDemoMode) {
    return (
      <DemoSignInGate
        emoji="🔖"
        title={t('demoGate.bookmarksTitle', 'Your saved āyāt await')}
        desc={t(
          'demoGate.bookmarksDesc',
          'Bookmarks are saved to your account — sign in to see every āyah you have marked across devices.'
        )}
        backTo="/quran"
        backLabel={t('demoGate.backToQuran', 'Back to Quran')}
        tabs={<QuranTabNav active="bookmarks" />}
      />
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranBookmarks.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="bookmarks" />

        {/* sub-tabs: saved āyāt vs saved duʿās */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-brand-emerald/10">
          {(
            [
              [
                'ayat',
                `${t('quranBookmarks.tabAyat')}${(summary?.bookmarks?.length ?? 0) > 0 ? ` · ${summary?.bookmarks?.length}` : ''}`,
              ],
              [
                'duas',
                `${t('quranBookmarks.tabDuas')}${savedDuas.length > 0 ? ` · ${savedDuas.length}` : ''}`,
              ],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 text-center text-xs font-bold py-1.5 rounded-lg transition-all ${tab === id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'duas' ? (
          isLoading ? (
            <div className="grid place-items-center py-12">
              <span className="loading loading-spinner loading-lg text-brand-emerald" />
            </div>
          ) : savedDuas.length === 0 ? (
            <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-10 text-center space-y-3">
              <div className="text-5xl">🤲</div>
              <p className="text-white font-black">
                {t('quranBookmarks.noDuasYet', 'No saved duʿās yet')}
              </p>
              <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
                {t(
                  'quranBookmarks.noDuasHint',
                  'On the Quran page, tap the 🏷️ tag on any duʿā from the Quran to keep it here.'
                )}
              </p>
              <button
                className="btn btn-sm rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info"
                onClick={() => navigate('/quran')}
              >
                {t('quranBookmarks.browseDuas', 'Browse duas →')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {savedDuas.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 hover:border-brand-gold/30 transition-all"
                >
                  <button
                    className="w-full text-left"
                    onClick={() =>
                      navigate(
                        `/quran/read/${d.surah}?start=${d.fromAyah}&end=${d.toAyah}&mode=bundle&dua=${d.id}`
                      )
                    }
                  >
                    <p className="text-white/80 text-sm font-bold">
                      {d.emoji} {d.title}
                    </p>
                    <p className="text-brand-gold/50 text-[11px] mt-1">
                      {t('quranBookmarks.duaRef', 'Quran {{ref}} · read with its story →', {
                        ref: `${d.surah}:${d.fromAyah}${d.toAyah !== d.fromAyah ? `–${d.toAyah}` : ''}`,
                      })}
                    </p>
                  </button>
                  <div className="flex justify-end mt-1">
                    <button
                      className="text-white/25 hover:text-red-300 text-xs"
                      onClick={() => setPendingRemoveDua(d.id)}
                    >
                      🗑 {t('quranBookmarks.remove', 'remove')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : isLoading ? (
          <div className="grid place-items-center py-12">
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-10 text-center space-y-3">
            <div className="text-5xl">🔖</div>
            <p className="text-white font-black">
              {t('quranBookmarks.noAyatYet', 'No saved āyāt yet')}
            </p>
            <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
              {t(
                'quranBookmarks.noAyatHint',
                'While reading, tap the bookmark icon on any āyah that touches your heart — it will wait for you here, organized by surah.'
              )}
            </p>
            <button
              className="btn btn-sm rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info"
              onClick={() => navigate('/quran/browse')}
            >
              {t('quranBookmarks.startReading', 'Start reading →')}
            </button>
          </div>
        ) : (
          groups.map((g, gi) => {
            const meta = metaOf(g.surah);
            const isOpen = openSurah === g.surah;
            return (
              <motion.div
                key={g.surah}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05 }}
                className="rounded-3xl bg-brand-deep/80 border border-brand-border overflow-hidden"
              >
                <button
                  onClick={() => setOpenSurah(isOpen ? null : g.surah)}
                  aria-expanded={isOpen}
                  className="w-full p-5 flex items-center justify-between gap-3 text-left"
                >
                  <h2 className="text-white font-black text-sm">
                    {g.surah}. {meta ? surahDisplayName(meta, i18n.language) : `Surah ${g.surah}`}
                    <span className="text-white/30 font-normal">
                      {' '}
                      ·{' '}
                      {t('quranBookmarks.savedCount', '{{count}} saved', { count: g.items.length })}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg text-white/60 font-serif" dir="rtl">
                      {meta?.name}
                    </span>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-2">
                        {g.items.map((b) => {
                          const a = ayahText(b.surah, b.ayah);
                          return (
                            <div
                              key={`${b.surah}:${b.ayah}`}
                              className="rounded-2xl bg-white/5 border border-brand-emerald/10 p-3.5 hover:border-brand-emerald/30 transition-all"
                            >
                              <button
                                className="w-full text-left"
                                onClick={() => navigate(`/quran/read/${b.surah}?start=${b.ayah}`)}
                              >
                                <p className="text-brand-emerald text-[11px] font-black mb-1.5">
                                  {t('quranBookmarks.ayahNo', 'Āyah {{n}} →', { n: b.ayah })}
                                </p>
                                {a ? (
                                  <p
                                    dir="rtl"
                                    lang="ar"
                                    className="text-white/80 font-serif leading-[1.9] text-lg line-clamp-2"
                                  >
                                    {a.arabic}
                                  </p>
                                ) : (
                                  <span className="loading loading-dots loading-xs text-white/30" />
                                )}
                                {a?.translations?.[0] && (
                                  <p className="text-white/40 text-xs mt-1.5 line-clamp-2">
                                    {a.translations[0]}
                                  </p>
                                )}
                              </button>
                              <div className="flex justify-end items-center gap-3 mt-1">
                                <button
                                  aria-label={t('shareAyah.shareButton', 'Share as image')}
                                  className="text-white/25 hover:text-brand-emerald text-xs flex items-center gap-1"
                                  onClick={() => setSharing(b)}
                                >
                                  <ShareIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  aria-label={t(
                                    'quranBookmarks.removeBookmarkAria',
                                    'Remove bookmark {{ref}}',
                                    { ref: `${b.surah}:${b.ayah}` }
                                  )}
                                  className="text-white/25 hover:text-red-300 text-xs"
                                  onClick={() => setPendingRemove(b)}
                                >
                                  🗑 {t('quranBookmarks.remove', 'remove')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        title={t('quranBookmarks.removeAyahTitle', 'Remove this saved āyah?')}
        message={
          pendingRemove
            ? t(
                'quranBookmarks.removeAyahMsg',
                'Surah {{surah}}, āyah {{ayah}} will be removed from your saved list.',
                { surah: pendingRemove.surah, ayah: pendingRemove.ayah }
              )
            : ''
        }
        confirmLabel={t('quranBookmarks.yesRemove', 'Yes, remove')}
        onConfirm={() => {
          if (pendingRemove) toggleBookmark.mutate(pendingRemove);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />

      <ConfirmDialog
        open={!!pendingRemoveDua}
        title={t('quranBookmarks.removeDuaTitle', 'Remove this saved duʿā?')}
        message={t(
          'quranBookmarks.removeDuaMsg',
          'It stays in the Duas list on the Quran page — only your saved tag is removed.'
        )}
        confirmLabel={t('quranBookmarks.yesRemove', 'Yes, remove')}
        onConfirm={() => {
          if (pendingRemoveDua) toggleDua.mutate(pendingRemoveDua);
          setPendingRemoveDua(null);
        }}
        onCancel={() => setPendingRemoveDua(null)}
      />

      {sharing && (
        <ShareAyahModal
          open={!!sharing}
          onClose={() => setSharing(null)}
          surahNo={sharing.surah}
          surahMeta={metaOf(sharing.surah) ?? null}
          ayahNumberInSurah={sharing.ayah}
          initialEditions={selectedTranslations()}
          initialTranslit={translitEnabled()}
        />
      )}
    </AnimatedBackground>
  );
}
