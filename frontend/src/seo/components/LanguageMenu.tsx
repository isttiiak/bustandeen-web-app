import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { CHROME, type SeoLang } from '../locales/chrome.js';

/** Each language in its own script, shown only inside the menu. */
export const NATIVE_NAME: Record<SeoLang, string> = {
  en: 'English',
  bn: 'বাংলা',
  ar: 'العربية',
};

const LOOK = {
  slate: {
    button: 'border-[#1e2d42] text-[#94a3b8] hover:text-[#10b981]',
    panel: 'bg-[#0d1520] border-[#1e2d42] text-[#f1f5f9]',
    item: 'hover:bg-[#1e2d42]',
    on: 'text-[#10b981]',
    muted: 'text-[#94a3b8]',
    input: 'bg-[#080c12] border-[#1e2d42] text-[#f1f5f9]',
    primary: 'bg-[#10b981] text-[#080c12]',
  },
  bustan: {
    button: 'border-brand-border text-white/70 hover:text-brand-emerald',
    panel: 'bg-brand-deep border-brand-border text-white',
    item: 'hover:bg-brand-surface',
    on: 'text-brand-emerald',
    muted: 'text-white/70',
    input: 'bg-brand-void border-brand-border text-white',
    primary: 'bg-brand-emerald-dim text-on-color',
  },
} as const;

/**
 * The static pages' language menu (Istiak, 2026-10-15): one globe button, no
 * language name in the header, so more languages fit later. The menu lists
 * the languages this page exists in and "Request a language", which opens a
 * small form that goes to the Feedback inbox (POST /api/feedback/language).
 *
 * Plain markup, no React state: <details> opens the menu without any script;
 * src/seo/langRequest.ts (document-level listeners) opens the dialog and
 * sends the form, so it works on prerendered pages and inside the app alike.
 */
export default function LanguageMenu({
  lang,
  langs,
  hrefFor,
  look,
}: {
  lang: SeoLang;
  langs: readonly SeoLang[];
  hrefFor: (l: SeoLang) => string;
  look: keyof typeof LOOK;
}) {
  const t = CHROME[lang];
  const r = t.langRequest;
  const s = LOOK[look];
  return (
    <>
      <details data-lang-menu className="relative">
        <summary
          aria-label={t.languageLabel}
          title={t.languageLabel}
          className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer grid place-items-center w-11 h-11 rounded-lg border ${s.button}`}
        >
          <GlobeAltIcon className="w-5 h-5" aria-hidden="true" />
        </summary>
        <div
          className={`absolute end-0 mt-2 w-56 rounded-xl border shadow-xl p-1.5 z-50 text-sm ${s.panel}`}
        >
          <ul>
            {langs.map((l) => (
              <li key={l}>
                <a
                  href={hrefFor(l)}
                  lang={l}
                  hrefLang={l}
                  aria-current={l === lang ? 'page' : undefined}
                  className={`flex items-center justify-between min-h-[44px] px-3 rounded-lg no-underline ${s.item} ${l === lang ? s.on : ''}`}
                >
                  {NATIVE_NAME[l]}
                  {l === lang && <span aria-hidden="true">✓</span>}
                </a>
              </li>
            ))}
          </ul>
          <div className="my-1 border-t border-current opacity-20" aria-hidden="true" />
          <button
            type="button"
            data-lang-request-open
            className={`w-full text-start min-h-[44px] px-3 rounded-lg font-semibold ${s.item} ${s.on}`}
          >
            {r.open}
          </button>
        </div>
      </details>

      <dialog
        data-lang-request
        aria-labelledby="lang-request-title"
        className={`w-[min(92vw,26rem)] rounded-2xl border p-0 backdrop:bg-black/60 ${s.panel}`}
      >
        <form
          data-lang-request-form
          data-sending={r.sending}
          data-sent={r.sent}
          data-failed={r.failed}
          className="p-5 space-y-4"
        >
          <h2 id="lang-request-title" className="text-lg font-bold">
            {r.title}
          </h2>
          <p className={`text-sm leading-relaxed ${s.muted}`}>{r.intro}</p>
          <label className="block text-sm font-semibold">
            {r.typeLabel}
            <input
              type="text"
              readOnly
              value={r.typeValue}
              className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 opacity-70 ${s.input}`}
            />
          </label>
          <label className="block text-sm font-semibold">
            {r.languageLabel}
            <input
              type="text"
              name="language"
              required
              minLength={2}
              maxLength={60}
              autoComplete="off"
              placeholder={r.placeholder}
              className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 ${s.input}`}
            />
          </label>
          {/* Honeypot: hidden from people, filled by bots, dropped by the server. */}
          <input
            type="text"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <p data-lang-request-status role="status" className={`text-sm ${s.muted}`} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              data-lang-request-cancel
              className={`min-h-[44px] px-4 rounded-lg border font-semibold ${s.button}`}
            >
              {r.cancel}
            </button>
            <button
              type="submit"
              className={`min-h-[44px] px-4 rounded-lg font-bold disabled:opacity-60 ${s.primary}`}
            >
              {r.send}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
