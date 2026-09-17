import ZikrAudioAsset, { IZikrAudioAsset } from '../models/ZikrAudioAsset.js';

export const listCuratedAudio = async (): Promise<IZikrAudioAsset[]> => ZikrAudioAsset.find();

/** Upsert by curated name — an Ansar sourcing clips one at a time may set
 * the same name's URL more than once (correcting a bad link, etc). */
export const setCuratedAudio = async (
  name: string,
  audioUrl: string,
  addedBy: string
): Promise<IZikrAudioAsset> =>
  ZikrAudioAsset.findOneAndUpdate(
    { name },
    { name, audioUrl, addedBy },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
