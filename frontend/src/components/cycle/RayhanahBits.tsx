import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../../utils/localeReference.js';
import { REF_LINK } from '../bustanStyles.js';

/** A sunnah.com / quran.com citation link. */
export function Ref({ href, label, block }: { href: string; label: string; block?: boolean }) {
  const { i18n } = useTranslation();
  return (
    <a
      className={block ? REF_LINK : 'underline underline-offset-2'}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {translateReference(label, i18n.language)}
    </a>
  );
}

/** The medallion at the top of the arch. */
export function Medallion({ tone, children }: { tone: 'pink' | 'emerald'; children: ReactNode }) {
  const cls =
    tone === 'pink'
      ? 'bg-brand-pink/10 border-brand-pink/40 text-brand-pink'
      : 'bg-brand-emerald/10 border-brand-emerald/40 text-brand-emerald';
  return (
    <span className={`mx-auto w-16 h-16 rounded-full grid place-items-center border ${cls}`}>
      {children}
    </span>
  );
}
