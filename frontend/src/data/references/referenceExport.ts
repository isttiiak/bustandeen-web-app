// One merged view of a reference: the registry entry, where it is used, and
// any manual check. Shared by the /references page and the published
// /references.json (which the native app reads instead of hunting for the
// same sources again).
import { DESK_CHECK, REFERENCES, type ReferenceEntry } from './registry.js';
import { REF_PAGES, type RefPlace } from './pages.js';
import usageJson from './usage.generated.json';

export type ManualStatus = 'source-verified' | 'scholar-confirmed' | 'needs-correction';

export interface ManualCheck {
  status: ManualStatus;
  /** Who checked: your name, or the scholar's. */
  by: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
}

export interface MappedReference extends ReferenceEntry {
  /** Where people see it: screen, section and item, with a link. */
  places: RefPlace[];
  /** Code comments citing it, when no screen shows it (a rule in the code). */
  codeNotes: number;
  /** Source files that cite it (for the admin checklist and the native app). */
  files: string[];
  manual?: ManualCheck;
}

type Usage = Record<string, { places: RefPlace[]; files: string[]; codeNotes?: number }>;
const USAGE = usageJson as Usage;

/** The registry with its places, and the manual checks when given (they come
 * from the server: GET /api/references/checks). */
export function mappedReferences(
  manual: Record<string, ManualCheck> = {},
  usage: Usage = USAGE
): MappedReference[] {
  return REFERENCES.map((r) => {
    const u = usage[r.id];
    const m = manual[r.id];
    return {
      ...r,
      places: (u?.places ?? []).filter((p) => p.page in REF_PAGES),
      codeNotes: u?.codeNotes ?? 0,
      files: u?.files ?? [],
      ...(m ? { manual: m } : {}),
    };
  });
}

/** The /references.json document: the registry and where each reference is
 * used. Manual checks change without a deploy, so they are not in this file:
 * read them from GET /api/references/checks. Stable key order so diffs stay
 * readable. */
export function referencesDocument(usage: Usage = USAGE) {
  return {
    about:
      'Bustandeen reference map: every Quran, hadith, scholarly, fiqh and data source the app cites, what it is used for, where it appears, and how it was desk-checked. Desk checks are not a scholar’s review. Manual checks (a person at the source, or a scholar) are live at manualChecksUrl.',
    deskCheck: DESK_CHECK,
    manualChecksUrl: 'https://bustandeen.com/api/references/checks',
    pages: REF_PAGES,
    references: mappedReferences({}, usage).map(({ manual: _manual, ...r }) => r),
  };
}
