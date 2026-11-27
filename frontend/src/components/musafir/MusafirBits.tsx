import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BriefcaseIcon,
  HomeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { translateReference } from '../../utils/localeReference.js';
import { type MusafirRef } from '../../utils/musafir.js';

/** One cited quote: the same "text · source · grade" contract used across the app. */
export function RefQuote({ r, lang }: { r: MusafirRef; lang: string }) {
  return (
    <div>
      <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
        {/* Quran lines carry their own quotation marks. */}
        {r.text.startsWith('“') ? '' : '“'}
        {lang === 'bn' ? r.textBn : r.text}
        {r.text.startsWith('“') ? '' : '”'}
      </p>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 mt-1 text-[11px] text-brand-gold underline underline-offset-2"
      >
        <BookOpenIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {translateReference(r.source, lang)}
        {r.grade !== 'Quran' && ` · ${translateReference(r.grade, lang)}`}
        <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" aria-hidden />
      </a>
    </div>
  );
}

/** Home to destination as a dashed road. Purely decorative, and still. */
export function JourneyRoad() {
  return (
    <div className="flex items-center gap-2 mt-4 max-w-xs mx-auto" aria-hidden>
      <HomeIcon className="w-5 h-5 text-white/70 shrink-0" />
      <span className="flex-1 border-t-2 border-dashed border-brand-border" />
      <BriefcaseIcon className="w-5 h-5 text-brand-gold shrink-0" />
      <span className="flex-1 border-t-2 border-dashed border-brand-border" />
      <MapPinIcon className="w-5 h-5 text-white/70 shrink-0" />
    </div>
  );
}
