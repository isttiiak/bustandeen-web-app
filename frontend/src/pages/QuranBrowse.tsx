import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import {
  loadSurahList,
  surahDisplayName,
  surahMeaningDisplay,
  type SurahMeta,
} from '../utils/quranData.js';
import { formatLocaleNumber } from '../utils/localeDate.js';

/**
 * Free reading: pick ANY surah, any time (the flexibility Istiak asked for:
 * "user might need to read some of the special surah in a specific time").
 * Everything read here still counts toward the daily goal and streak.
 */
export default function QuranBrowse() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((l) => {
        if (alive) setSurahs(l);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return surahs;
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(needle) ||
        s.englishNameTranslation.toLowerCase().includes(needle) ||
        String(s.number) === needle
    );
  }, [surahs, q]);

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranBrowse.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="read" />

        <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-brand-void/90 backdrop-blur-md">
          <input
            type="search"
            placeholder={t('quranBrowse.searchPlaceholder')}
            aria-label={t('quranBrowse.searchAriaLabel')}
            className="input input-bordered w-full bg-brand-deep border-brand-border text-white rounded-control shadow-elev-1 placeholder:text-white/50 focus:border-brand-emerald/50"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {error ? (
          <p className="text-white/60 text-sm text-center py-8">{t('quranBrowse.loadError')}</p>
        ) : surahs.length === 0 ? (
          <div className="grid place-items-center py-10">
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <button
                key={s.number}
                className="w-full flex items-center gap-3 rounded-card bg-brand-deep border border-brand-border shadow-elev-1 hover:border-brand-emerald/40 hover:shadow-hover px-4 py-3 text-left transition"
                onClick={() => navigate(`/quran/read/${s.number}`)}
              >
                <span className="w-9 h-9 rounded-control bg-brand-emerald/10 border border-brand-emerald/30 grid place-items-center text-brand-emerald text-xs font-bold tabular-nums shrink-0">
                  {formatLocaleNumber(s.number)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-bold text-sm">
                    {surahDisplayName(s, i18n.language)}
                  </span>
                  <span className="block text-white/60 text-xs truncate">
                    {surahMeaningDisplay(s, i18n.language)} · {formatLocaleNumber(s.numberOfAyahs)}{' '}
                    āyāt · {s.revelationType}
                  </span>
                </span>
                <span className="text-xl text-brand-gold font-serif" dir="rtl" lang="ar">
                  {s.name}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-white/60 text-sm text-center py-6">
                {t('quranBrowse.noMatch', { query: q })}
              </p>
            )}
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}
