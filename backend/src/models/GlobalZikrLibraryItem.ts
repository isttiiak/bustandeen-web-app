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
export interface IGlobalZikrLibraryItem extends Document {
  name: string;
  arabic: string;
  transliteration?: string;
  meaning: string;
  source: string;
  sourceUrl: string;
  grade?: string;
  virtue?: string;
  requestId?: mongoose.Types.ObjectId;
  addedBy?: string;
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
    requestId: { type: Schema.Types.ObjectId, ref: 'ZikrRequest' },
    addedBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IGlobalZikrLibraryItem>(
  'GlobalZikrLibraryItem',
  globalZikrLibraryItemSchema
);
