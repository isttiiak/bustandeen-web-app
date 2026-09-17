import mongoose, { Document, Schema } from 'mongoose';

/**
 * Audio-recitation link for a CURATED (static frontend) zikr — the curated
 * list lives only in `frontend/src/utils/zikrLibrary.ts` (backend never
 * imports frontend code, same boundary `zikrDuplicateMatch.ts` respects), so
 * this is keyed by the curated entry's own `name` rather than a Mongo _id.
 * `GlobalZikrLibraryItem` (the community-approved list) tracks its own
 * `audioUrl` field directly since it's already a live DB document.
 */
export interface IZikrAudioAsset extends Document {
  name: string;
  audioUrl: string;
  addedBy: string;
  createdAt: Date;
}

const zikrAudioAssetSchema = new Schema<IZikrAudioAsset>(
  {
    name: { type: String, required: true, unique: true, maxlength: 100 },
    audioUrl: { type: String, required: true, maxlength: 500 },
    addedBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IZikrAudioAsset>('ZikrAudioAsset', zikrAudioAssetSchema);
