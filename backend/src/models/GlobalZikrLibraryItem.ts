import mongoose, { Document, Schema } from 'mongoose';

/**
 * Community-suggested dhikr/duas an admin has verified and approved via the
 * ZikrRequest review flow (see zikrRequest.service.ts). Kept as its own
 * live-editable collection rather than in the static frontend
 * `utils/zikrLibrary.ts` catalog, so an approval shows up for every user
 * immediately — no frontend rebuild/redeploy needed. The frontend fetches
 * these via GET /api/zikr/library and renders them as an extra category
 * alongside the curated ZIKR_LIBRARY.
 */
/** Same 6 category ids as the curated `frontend/src/utils/zikrLibrary.ts`
 * (`ZIKR_LIBRARY`'s category `id`s) so the admin-managed library and the
 * curated one share one taxonomy instead of inventing a second. An enum
 * (not free text) avoids category-name drift between admin sessions.
 * 'uncategorized' is the explicit bucket for anything that doesn't fit. */
export type GlobalZikrCategory =
  'tasbih' | 'istighfar' | 'salawat' | 'kalimat' | 'asma' | 'protection' | 'uncategorized';

export interface IGlobalZikrLibraryItem extends Document {
  name: string;
  arabic: string;
  transliteration?: string;
  meaning: string;
  source: string;
  sourceUrl: string;
  grade?: string;
  virtue?: string;
  category: GlobalZikrCategory;
  requestId?: mongoose.Types.ObjectId;
  addedBy?: string;
  /** Optional audio recitation URL — paste-a-link only (matches the existing
   * sourceUrl/photoUrl convention app-wide), not a binary upload widget.
   * Wiring this into zikr-counter playback is separate, unbuilt work — this
   * field only supports the admin "which clips are missing" tracker. */
  audioUrl?: string;
  createdAt: Date;
}

const globalZikrLibraryItemSchema = new Schema<IGlobalZikrLibraryItem>(
  {
    name: { type: String, required: true, maxlength: 100 },
    arabic: { type: String, required: true, maxlength: 2000 },
    transliteration: { type: String, maxlength: 500 },
    meaning: { type: String, required: true, maxlength: 2000 },
    source: { type: String, required: true, maxlength: 200 },
    sourceUrl: { type: String, required: true, maxlength: 500 },
    grade: { type: String, maxlength: 200 },
    virtue: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: ['tasbih', 'istighfar', 'salawat', 'kalimat', 'asma', 'protection', 'uncategorized'],
      default: 'uncategorized',
    },
    requestId: { type: Schema.Types.ObjectId, ref: 'ZikrRequest' },
    addedBy: { type: String },
    audioUrl: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IGlobalZikrLibraryItem>(
  'GlobalZikrLibraryItem',
  globalZikrLibraryItemSchema
);
