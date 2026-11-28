import type { Migration } from './runner.js';

/**
 * Naseeh (the Groq-based AI companion) was retired 2026-11-28. Removes the last
 * traces of it from User documents:
 *   - `groqApiKeyEnc` / `groqApiKeySetAt`: a user's own saved Groq API key
 *     (encrypted). The feature that used it is gone, so the ciphertext goes too.
 *   - `aiEnabled`: set back to false for everyone who had turned it on.
 * NaseehPlan documents (saved weekly plans) are left alone: they are the user's
 * own data, still in their export and deleted with their account.
 * A second run finds nothing to change.
 */
export const retireNaseeh: Migration = {
  id: '003-retire-naseeh',
  description: 'Unset stored Groq API keys and turn aiEnabled off on every user',
  async up({ db, apply }): Promise<Record<string, number>> {
    const users = db.collection('users');
    const keyFilter = {
      $or: [{ groqApiKeyEnc: { $exists: true } }, { groqApiKeySetAt: { $exists: true } }],
    };
    const aiFilter = { aiEnabled: true };

    if (!apply) {
      return {
        usersWithGroqKey: await users.countDocuments({ groqApiKeyEnc: { $type: 'string' } }),
        usersWithKeyFields: await users.countDocuments(keyFilter),
        usersWithAiOn: await users.countDocuments(aiFilter),
      };
    }
    const keys = await users.updateMany(keyFilter, {
      $unset: { groqApiKeyEnc: '', groqApiKeySetAt: '' },
    });
    const ai = await users.updateMany(aiFilter, { $set: { aiEnabled: false } });
    return { keyFieldsRemoved: keys.modifiedCount, aiTurnedOff: ai.modifiedCount };
  },
};
