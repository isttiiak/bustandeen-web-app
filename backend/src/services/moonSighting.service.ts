import MoonSighting, { type IMoonSighting } from '../models/MoonSighting.js';

/** What devices receive: the active records only, oldest first per country. */
export interface PublicMoonSighting {
  id: string;
  country: string;
  effectiveFrom: string;
  offset: number;
  note: string;
  sourceUrl?: string;
}

function toPublic(r: IMoonSighting): PublicMoonSighting {
  return {
    id: String(r._id),
    country: r.country,
    effectiveFrom: r.effectiveFrom,
    offset: r.offset,
    note: r.note,
    ...(r.sourceUrl ? { sourceUrl: r.sourceUrl } : {}),
  };
}

export async function listActive(): Promise<PublicMoonSighting[]> {
  const rows = await MoonSighting.find({ active: true }).sort({ country: 1, effectiveFrom: 1 });
  return rows.map(toPublic);
}

/** Admin view: every record, newest first, including deactivated ones. */
export async function listAll(): Promise<IMoonSighting[]> {
  return MoonSighting.find({}).sort({ effectiveFrom: -1, createdAt: -1 }).limit(500);
}

export async function create(
  input: Pick<IMoonSighting, 'country' | 'effectiveFrom' | 'offset' | 'note'> & {
    sourceUrl?: string;
  },
  createdBy: string
): Promise<IMoonSighting> {
  return MoonSighting.create({ ...input, createdBy, active: true });
}

export async function deactivate(id: string, by: string): Promise<IMoonSighting | null> {
  return MoonSighting.findOneAndUpdate(
    { _id: id, active: true },
    { $set: { active: false, deactivatedBy: by, deactivatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
