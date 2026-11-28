// One merged view of a reference: the registry entry, where it is used, and
// any manual check. Shared by the /references page and the published
// /references.json (which the native app reads instead of hunting for the
// same sources again).
import { DESK_CHECK, REFERENCES, type ReferenceEntry } from './registry.js';
import { REF_PAGES, type RefPageKey } from './pages.js';
import usageJson from './usage.generated.json';
import manualJson from './manualChecks.json';

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
  pages: RefPageKey[];
  files: string[];
  manual?: ManualCheck;
}

const USAGE = usageJson as Record<string, { pages: string[]; files: string[] }>;
const MANUAL = manualJson as Record<string, ManualCheck>;

export function mappedReferences(
  usage: Record<string, { pages: string[]; files: string[] }> = USAGE,
  manual: Record<string, ManualCheck> = MANUAL
): MappedReference[] {
  return REFERENCES.map((r) => {
    const u = usage[r.id];
    const m = manual[r.id];
    return {
      ...r,
      pages: (u?.pages ?? []).filter((p): p is RefPageKey => p in REF_PAGES),
      files: u?.files ?? [],
      ...(m ? { manual: m } : {}),
    };
  });
}

/** The /references.json document. Stable key order so diffs stay readable. */
export function referencesDocument(
  usage: Record<string, { pages: string[]; files: string[] }> = USAGE,
  manual: Record<string, ManualCheck> = MANUAL
) {
  return {
    about:
      'Bustandeen reference map: every Quran, hadith, scholarly, fiqh and data source the app cites, what it is used for, where, and how it was checked. Desk checks are not a scholar’s review; see manual for checks by a person at the source or a scholar.',
    deskCheck: DESK_CHECK,
    pages: REF_PAGES,
    references: mappedReferences(usage, manual),
  };
}
