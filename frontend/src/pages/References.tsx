import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon, BookOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import ReportReference from '../components/ReportReference.js';
import ReferenceCard, { KIND_KEYS } from '../components/references/ReferenceCard.js';
import { BTN_SECONDARY, CARD, OPTION_OFF, OPTION_ON, TILE } from '../components/bustanStyles.js';
import { DESK_CHECK, type RefKind } from '../data/references/registry.js';
import { mappedReferences } from '../data/references/referenceExport.js';
import { REF_PAGES } from '../data/references/pages.js';

type StatusFilter = 'all' | 'needsManual' | 'manual' | 'corrected' | 'weak' | 'unverified';

const KINDS: (RefKind | 'all')[] = ['all', 'quran', 'hadith', 'scholarly', 'fiqh', 'data'];
const ALL = mappedReferences();

const FIELD =
  'min-h-[44px] px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/60 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors';

/**
 * /references: the reference map. Every Quran verse, hadith, scholarly work,
 * fiqh position and data source the app relies on, what it is used for, where
 * it shows, how it was desk-checked, and whether a person has checked it by
 * hand. Public, so a scholar can review it without an account.
 */
export default function References() {
  const { t, i18n } = useTranslation();
  const bn = i18n.language === 'bn';
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<RefKind | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const stats = useMemo(
    () => ({
      total: ALL.length,
      corrected: ALL.filter((r) => r.desk === 'corrected').length,
      weak: ALL.filter((r) => r.desk === 'weak').length,
      manual: ALL.filter((r) => r.manual && r.manual.status !== 'needs-correction').length,
    }),
    []
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((r) => {
      if (kind !== 'all' && r.kind !== kind) return false;
      if (status === 'needsManual' && r.manual) return false;
      if (status === 'manual' && !r.manual) return false;
      if (status === 'corrected' && r.desk !== 'corrected') return false;
      if (status === 'weak' && r.desk !== 'weak') return false;
      if (status === 'unverified' && r.desk !== 'unverified') return false;
      if (!q) return true;
      const pages = r.places
        .map((p) => {
          const page = REF_PAGES[p.page];
          return `${page.label} ${page.labelBn} ${p.section} ${p.sectionBn} ${p.item ?? ''}`;
        })
        .join(' ');
      return `${r.citation} ${r.purpose} ${r.grade ?? ''} ${r.id} ${pages}`
        .toLowerCase()
        .includes(q);
    });
  }, [query, kind, status]);

  const num = (n: number) => n.toLocaleString(bn ? 'bn-BD' : 'en');

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('references.seoTitle', 'Reference map: every source Bustandeen cites')}
        description={t(
          'references.seoDescription',
          'Every Quran verse, hadith, scholarly work and data source in Bustandeen, what it is used for, where it appears, and how it was checked.'
        )}
        path="/references"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-4 pb-10">
          <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
              <BookOpenIcon className="w-7 h-7 text-brand-gold" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white">
              {t('references.title', 'Reference map')}
            </h1>
            <p className="text-white/80 text-sm leading-relaxed max-w-xl mx-auto">
              {t(
                'references.intro',
                'Every Quran verse, hadith, scholarly work and data source Bustandeen relies on: what it is used for, where it shows in the app, and how it was checked.'
              )}
            </p>
          </section>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                ['total', stats.total, 'References'],
                ['corrected', stats.corrected, 'Corrected in the audit'],
                ['weak', stats.weak, 'Weak, shown as weak'],
                ['manual', stats.manual, 'Checked by hand'],
              ] as const
            ).map(([key, n, fallback]) => (
              <div key={key} className={TILE}>
                <p className="font-display text-2xl font-bold text-white">{num(n)}</p>
                <p className="text-white/70 text-xs mt-1">
                  {t(`references.stat.${key}`, fallback)}
                </p>
              </div>
            ))}
          </div>

          <section className={`${CARD} p-5 space-y-2 text-sm text-white/80 leading-relaxed`}>
            <h2 className="font-display text-white font-bold text-base">
              {t('references.howTitle', 'How each reference is checked')}
            </h2>
            <p>
              <span className="text-white font-semibold">
                {t('references.deskLabel', 'Desk check')} ({DESK_CHECK.date}):
              </span>{' '}
              {t(
                'references.deskText',
                'the hadith number was opened and its text and grade compared with what the app says; Quran citations were compared with quran.com and the bundled Tanzil text. Wrong numbers, grades and wordings were corrected. A desk check is not a scholar’s review.'
              )}
            </p>
            <p>
              <span className="text-white font-semibold">
                {t('references.manualLabel', 'Manual check')}:
              </span>{' '}
              {t(
                'references.manualText',
                'a person opens the source, or asks a scholar, and marks the reference. These marks are added slowly and on purpose; until then a reference shows "Manual check: not yet".'
              )}
            </p>
            <p className="text-white/70 text-xs">
              {t(
                'references.dataNote',
                'Citations, purposes and grades are kept in English so they match the sources word for word.'
              )}
            </p>
            <a href="/references.json" download className={`${BTN_SECONDARY} !text-xs mt-1`}>
              <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
              {t('references.download', 'Download as JSON')}
            </a>
          </section>

          <div className="space-y-3">
            <label className="relative block">
              <span className="sr-only">{t('references.searchLabel', 'Search references')}</span>
              <MagnifyingGlassIcon
                className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  'references.searchPlaceholder',
                  'Search: Bukhārī 998, Witr, Musafir…'
                )}
                className={`${FIELD} w-full pl-9`}
              />
            </label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('references.kindFilter', 'Type')}
            >
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={`min-h-[44px] px-3 rounded-control border text-xs font-bold transition-colors ${kind === k ? OPTION_ON : OPTION_OFF}`}
                >
                  {k === 'all' ? t('references.kind.all', 'All') : t(KIND_KEYS[k])}
                </button>
              ))}
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              aria-label={t('references.statusFilter', 'Check status')}
              className={FIELD}
            >
              <option value="all">{t('references.status.all', 'Any check status')}</option>
              <option value="needsManual">
                {t('references.status.needsManual', 'Waiting for a manual check')}
              </option>
              <option value="manual">{t('references.status.manual', 'Checked by hand')}</option>
              <option value="corrected">
                {t('references.status.corrected', 'Corrected in the audit')}
              </option>
              <option value="weak">{t('references.status.weak', 'Weak narrations')}</option>
              <option value="unverified">
                {t('references.status.unverified', 'Desk check incomplete')}
              </option>
            </select>
            <p className="text-white/70 text-xs" aria-live="polite">
              {t('references.showing', 'Showing {{shown}} of {{total}}', {
                shown: num(shown.length),
                total: num(stats.total),
              })}
            </p>
          </div>

          <ul className="space-y-3">
            {shown.map((r) => (
              <ReferenceCard key={r.id} entry={r} />
            ))}
          </ul>

          <ReportReference variant="card" what="Reference map" />
        </div>
      </div>
    </AnimatedBackground>
  );
}
