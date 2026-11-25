import type { Migration } from './runner.js';

/**
 * After the admin "Zikr audio tracker" was removed: drops the
 * `zikraudioassets` collection and unsets `audioUrl` on every community-library
 * item (both were paste-a-link fields that nothing in the app ever played).
 * A second run finds nothing to drop and nothing to unset.
 */
export const removeZikrAudioLinks: Migration = {
  id: '002-remove-zikr-audio-links',
  description: 'Drop zikraudioassets and unset audioUrl on library items',
  async up({ db, apply }) {
    let droppedDocuments = 0;
    const present = await db.listCollections({ name: 'zikraudioassets' }).toArray();
    if (present.length > 0) {
      droppedDocuments = await db.collection('zikraudioassets').countDocuments();
      if (apply) await db.collection('zikraudioassets').drop();
    }

    const filter = { audioUrl: { $exists: true } };
    const items = db.collection('globalzikrlibraryitems');
    const libraryItems = apply
      ? (await items.updateMany(filter, { $unset: { audioUrl: '' } })).modifiedCount
      : await items.countDocuments(filter);

    return { droppedDocuments, libraryItems };
  },
};
