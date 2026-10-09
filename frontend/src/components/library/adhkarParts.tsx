import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { AdhkarItem, QuranPart } from '../../seo/content/adhkar.js';
import { arabicAyahs, loadTanzilSurah } from '../../utils/quranData.js';
import { translateReference } from '../../utils/localeReference.js';
import { ARABIC_STYLE } from './libraryParts.js';

// Parts of the guided adhkar routine (T4.3, /library/adhkar).

/** Quran items read the bundled Tanzil text, verbatim (never retyped). */
function QuranArabic({ part }: { part: QuranPart }) {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ['tanzil', part.surah],
    queryFn: () => loadTanzilSurah(part.surah),
    staleTime: Infinity,
  });
  if (q.isPending)
    return <p className="text-white/60 text-sm">{t('library.adhkarQuranLoading')}</p>;
  if (q.isError || !q.data)
    return <p className="text-white/70 text-sm">{t('library.adhkarQuranError')}</p>;
  const all = arabicAyahs(q.data);
  const from = part.from ?? 1;
  const to = part.to ?? all.length;
  return (
    <p dir="rtl" lang="ar" className="text-xl leading-loose text-white" style={ARABIC_STYLE}>
      {all.slice(from - 1, to).join(' ۝ ')}
    </p>
  );
}

/** Arabic, transliteration, meaning and source of one adhkar. */
export function AdhkarText({ item, lang }: { item: AdhkarItem; lang: 'en' | 'bn' }) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {item.quran ? (
        item.quran.map((p) => <QuranArabic key={`${p.surah}:${p.from ?? ''}`} part={p} />)
      ) : (
        <p dir="rtl" lang="ar" className="text-xl leading-loose text-white" style={ARABIC_STYLE}>
          {item.arabic}
        </p>
      )}
      <p className="italic text-white/60 text-xs">{item.transliteration}</p>
      <p className="text-white/80 text-sm leading-relaxed">{item.translation[lang]}</p>
      <div className="pt-2 border-t border-brand-border flex items-start justify-between gap-3 text-xs">
        <span className="text-white/60">{t('library.sourceLabel')}</span>
        <span className="text-right">
          <a
            href={item.reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold underline underline-offset-2"
          >
            {item.reference.grade === 'Quran'
              ? translateReference(item.reference.text, i18n.language)
              : translateReference(
                  `${item.reference.text} · ${item.reference.grade}`,
                  i18n.language
                )}
          </a>
          {item.quran && (
            <span className="block text-white/60 mt-1">
              {t('library.adhkarArabicText')}{' '}
              <a
                href="https://tanzil.net"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Tanzil
              </a>
            </span>
          )}
        </span>
      </div>
    </>
  );
}

/** The big tap target: a progress ring around the count. */
export function CountRing({
  count,
  total,
  label,
  onTap,
}: {
  count: number;
  total: number;
  label: string;
  onTap: () => void;
}) {
  const size = 148;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      data-testid="adhkar-counter"
      className="relative mx-auto grid place-items-center w-[148px] h-[148px] rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-void active:scale-[0.98] transition-transform"
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 w-full h-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-brand-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, count / total))}
          className="stroke-brand-emerald transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none"
        />
      </svg>
      <span className="relative font-black text-3xl tabular-nums leading-none">
        {count}
        <span className="block text-sm font-semibold text-white/60 mt-1">/ {total}</span>
      </span>
    </button>
  );
}
