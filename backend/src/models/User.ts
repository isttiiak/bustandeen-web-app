import mongoose, { Document, Schema } from 'mongoose';

export interface IZikrTypeItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
}

export interface ILinkedProvider {
  provider: string; // 'google.com'
  email: string;
  providerUid: string; // Google's sub-UID
}

export interface ISalatResetEntry {
  date: string; // YYYY-MM-DD — first day of the new phase
  note: string;
  resetAt: Date;
}

export interface IUser extends Document {
  uid: string;
  email: string;
  primaryEmail?: string;
  linkedProviders?: ILinkedProvider[];
  displayName?: string;
  photoUrl?: string;
  firstName?: string;
  lastName?: string;
  occupation?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
  birthDate?: Date;
  bio?: string;
  city?: string;
  country?: string;
  hijriOffset: number;
  /** How the user's daily tracking day begins for zikr/salat/quran (see
   * frontend/src/utils/trackingDay.ts) — mirrored to localStorage for the
   * offline-first client calc. Fasting and salat kaza-debt history always
   * use civil midnight regardless of this setting. */
  dayStartMode: 'fajr' | 'midnight' | 'maghrib';
  aiEnabled: boolean;
  /** User's own Groq API key (AES-256-GCM, see utils/fieldCrypto.ts) — opt-in
   * alternative to the app's shared GROQ_API_KEY. Write-only from the API's
   * perspective: never decrypted back out to a client, only used server-side
   * in ai.service.ts. Null/unset means "use the shared key". */
  groqApiKeyEnc?: string | null;
  /** When the current groqApiKeyEnc was saved — surfaced read-only in
   * Settings ("added on ...") so the user has some confirmation the key is
   * actually stored, without ever re-exposing the key itself. Cleared
   * alongside groqApiKeyEnc. */
  groqApiKeySetAt?: Date | null;
  /** Set once the one-time welcome email has been attempted for this account
   * (auth.controller.ts, on the very first /api/auth/verify). Unset on every
   * account that existed before that feature shipped — used to find
   * candidates for the admin's one-time backfill send (adminUsers.service.ts),
   * not to guarantee delivery (email.service.ts never throws either way). */
  welcomeEmailSentAt?: Date | null;
  /** Servant-only abuse control (adminUsers.service.ts) — blocks sign-in at
   * both requireAuth (every other authenticated route) and /api/auth/verify
   * itself. Never a substitute for account deletion: the account and its
   * data stay intact, just inaccessible, so it's reversible. */
  disabled: boolean;
  disabledAt?: Date | null;
  disabledReason?: string | null;
  salatResetDate?: string;
  salatResetHistory: ISalatResetEntry[];
  totalCount: number;
  zikrTotals: Map<string, number>;
  zikrTypes: mongoose.Types.DocumentArray<IZikrTypeItem & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    primaryEmail: { type: String },
    linkedProviders: {
      type: [
        {
          provider: { type: String, required: true },
          email: { type: String, required: true },
          providerUid: { type: String, required: true },
        },
      ],
      default: [],
    },
    displayName: { type: String },
    photoUrl: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    occupation: { type: String },
    bio: { type: String, maxlength: 250 },
    city: { type: String },
    country: { type: String },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_say'],
      default: undefined,
    },
    birthDate: { type: Date },
    hijriOffset: { type: Number, default: 0, min: -1, max: 1 },
    dayStartMode: {
      type: String,
      enum: ['fajr', 'midnight', 'maghrib'],
      default: 'fajr',
    },
    aiEnabled: { type: Boolean, default: false },
    groqApiKeyEnc: { type: String, default: null },
    groqApiKeySetAt: { type: Date, default: null },
    welcomeEmailSentAt: { type: Date, default: null },
    disabled: { type: Boolean, default: false },
    disabledAt: { type: Date, default: null },
    disabledReason: { type: String, default: null, maxlength: 500 },
    salatResetDate: { type: String, default: undefined },
    salatResetHistory: {
      type: [
        {
          date: { type: String, required: true },
          note: { type: String, default: '' },
          resetAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    totalCount: { type: Number, default: 0 },
    zikrTotals: { type: Map, of: Number, default: {} },
    zikrTypes: {
      type: [
        {
          name: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [
        { name: 'SubhanAllah' },
        { name: 'Alhamdulillah' },
        { name: 'Allahu Akbar' },
        { name: 'La ilaha illallah' },
      ],
    },
  },
  { timestamps: true }
);

// Ensure uniqueness of zikrTypes.name per user (case-insensitive)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose v9: async pre-hook; `this` isn't typed as the hydrated document
userSchema.pre('save', async function (this: any) {
  if (!this.isModified('zikrTypes')) return;
  const seen = new Set<string>();
  this.zikrTypes = this.zikrTypes.filter((t: { name: string }) => {
    const key = t.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});

export default mongoose.model<IUser>('User', userSchema);
