import admin from 'firebase-admin';
import { isFirebaseInitialized } from '../config/firebaseAdmin.js';
import User, { IUser, ILinkedProvider } from '../models/User.js';
import { isAvatarId, type AvatarId } from '../utils/avatars.js';
import ZikrDaily from '../models/ZikrDaily.js';
import ZikrGoal from '../models/ZikrGoal.js';
import ZikrStreak from '../models/ZikrStreak.js';
import SalatLog from '../models/SalatLog.js';
import SalatDebt from '../models/SalatDebt.js';
import SalatDebtEvent from '../models/SalatDebtEvent.js';
import KazaUnit from '../models/KazaUnit.js';
import FastingLog from '../models/FastingLog.js';
import AdhkarDay from '../models/AdhkarDay.js';
import FastingProfile from '../models/FastingProfile.js';
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import HifzEntry from '../models/HifzEntry.js';
import HifzProfile from '../models/HifzProfile.js';
import HifzLog from '../models/HifzLog.js';
import CycleLog from '../models/CycleLog.js';
import CycleDay from '../models/CycleDay.js';
import CycleProfile from '../models/CycleProfile.js';
import SocialProfile from '../models/SocialProfile.js';

// Belt-and-braces: the Zod schema catches invalid photoUrls at the HTTP boundary;
// this helper protects direct service calls (backup restore, future callers).
// Rules mirror the Zod schema in validation/user.schemas.ts — keep in sync.
const PHOTO_SAFE_DATA_RE = /^data:image\/(jpeg|png|webp);base64,/;
function isValidPhotoUrl(url: string): boolean {
  if (url.startsWith('https://')) return url.length <= 2048;
  return PHOTO_SAFE_DATA_RE.test(url) && url.length <= 2048;
}

/** The User fields the browser is allowed to see. A whitelist, not a
 * blacklist: every field added to the schema stays server-only until it is
 * listed here. Readers: pages/Profile.tsx (DBUser), hooks/useUserProfile.ts,
 * Settings (export overview), App.tsx (auth/verify reconcile). Server-only
 * fields (groqApiKeyEnc, admin email bookkeeping, disabled*, zikrTotals, ...)
 * must never be added. */
export interface ClientUser {
  uid: string;
  email: string;
  primaryEmail?: string;
  linkedProviders: ILinkedProvider[];
  displayName?: string;
  photoUrl?: string;
  avatarId?: AvatarId;
  firstName?: string;
  lastName?: string;
  occupation?: string;
  gender?: IUser['gender'];
  birthDate?: Date;
  bio?: string;
  city?: string;
  country?: string;
  hijriOffset: number;
  /** false = Automatic: the device applies its country's moon-sighting record */
  hijriManual: boolean;
  dayStartMode: IUser['dayStartMode'];
  aiEnabled: boolean;
  onboardingRequired: boolean;
  onboardedAt: Date | null;
  totalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Whether the user chose their own Hijri offset (T4.1). Accounts from before
 * the flag existed count as manual only with a non-zero offset: 0 was the
 * default almost nobody picked, so those follow their country. */
export function hijriIsManual(u: Pick<IUser, 'hijriOffset' | 'hijriOffsetSet'>): boolean {
  return u.hijriOffsetSet ?? (u.hijriOffset ?? 0) !== 0;
}

export function toClientUser(user: IUser): ClientUser {
  return {
    uid: user.uid,
    email: user.email,
    primaryEmail: user.primaryEmail,
    linkedProviders: (user.linkedProviders ?? []).map((p) => ({
      provider: p.provider,
      email: p.email,
      providerUid: p.providerUid,
    })),
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    avatarId: user.avatarId,
    firstName: user.firstName,
    lastName: user.lastName,
    occupation: user.occupation,
    gender: user.gender,
    birthDate: user.birthDate,
    bio: user.bio,
    city: user.city,
    country: user.country,
    hijriOffset: user.hijriOffset,
    hijriManual: hijriIsManual(user),
    dayStartMode: user.dayStartMode,
    aiEnabled: user.aiEnabled,
    onboardingRequired: user.onboardingRequired === true,
    onboardedAt: user.onboardedAt ?? null,
    totalCount: user.totalCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getUserById(uid: string): Promise<IUser | null> {
  return User.findOne({ uid });
}

export interface UserUpdateFields {
  displayName?: string;
  photoUrl?: string;
  avatarId?: AvatarId | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
  birthDate?: Date | string;
  firstName?: string;
  lastName?: string;
  occupation?: string;
  bio?: string;
  city?: string;
  country?: string;
  /** A number = the user's own offset; null = Automatic (T4.1) */
  hijriOffset?: number | null;
  dayStartMode?: 'fajr' | 'midnight' | 'maghrib';
  aiEnabled?: boolean;
  /** true = onboarding finished, skipped or dismissed. Only the first one is
   * recorded; it can't be un-set (the flow stays reachable from Settings). */
  onboarded?: true;
}

export async function linkGoogleProvider(
  uid: string,
  googleEmail: string,
  googleUid: string
): Promise<IUser | null> {
  // Prevent the same Google account being linked to two Bustandeen accounts
  const duplicate = await User.findOne({
    'linkedProviders.providerUid': googleUid,
    uid: { $ne: uid },
  });
  if (duplicate) {
    const err = Object.assign(
      new Error('This Google account is already linked to another Bustandeen account.'),
      { statusCode: 409 }
    );
    throw err;
  }

  const entry: ILinkedProvider = {
    provider: 'google.com',
    email: googleEmail,
    providerUid: googleUid,
  };
  return User.findOneAndUpdate({ uid }, { $addToSet: { linkedProviders: entry } }, { new: true });
}

export async function unlinkGoogleProvider(
  uid: string,
  providerUid: string
): Promise<IUser | null> {
  return User.findOneAndUpdate(
    { uid },
    { $pull: { linkedProviders: { providerUid } } },
    { new: true }
  );
}

export async function setPrimaryEmail(uid: string, email: string): Promise<IUser | null> {
  return User.findOneAndUpdate({ uid }, { $set: { primaryEmail: email } }, { new: true });
}

export async function deleteAccount(uid: string): Promise<void> {
  await Promise.all([
    ZikrDaily.deleteMany({ userId: uid }),
    ZikrGoal.deleteMany({ userId: uid }),
    ZikrStreak.deleteMany({ userId: uid }),
    SalatLog.deleteMany({ userId: uid }),
    SalatDebt.deleteMany({ userId: uid }),
    SalatDebtEvent.deleteMany({ userId: uid }),
    KazaUnit.deleteMany({ userId: uid }),
    FastingLog.deleteMany({ userId: uid }),
    FastingProfile.deleteMany({ userId: uid }),
    AdhkarDay.deleteMany({ userId: uid }),
    QuranLog.deleteMany({ userId: uid }),
    QuranProfile.deleteMany({ userId: uid }),
    HifzEntry.deleteMany({ userId: uid }),
    HifzProfile.deleteMany({ userId: uid }),
    HifzLog.deleteMany({ userId: uid }),
    CycleLog.deleteMany({ userId: uid }),
    CycleDay.deleteMany({ userId: uid }),
    CycleProfile.deleteMany({ userId: uid }),
    SocialProfile.deleteMany({ userId: uid }),
    User.deleteOne({ uid }),
  ]);

  // Skip in environments without Firebase Admin credentials (local dev without
  // a service account, DEV_AUTH_BYPASS) — admin.auth() throws synchronously
  // there ("app/no-app"), which would otherwise surface as a 500 even though
  // the Mongo purge above already succeeded.
  if (!isFirebaseInitialized()) return;

  try {
    await admin.auth().deleteUser(uid);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // auth/user-not-found is fine — the Firebase user may already be gone
    if (code !== 'auth/user-not-found') throw err;
  }
}

export async function updateUser(uid: string, fields: UserUpdateFields): Promise<IUser | null> {
  const updates: Partial<IUser> = {};
  if (fields.displayName !== undefined) updates.displayName = fields.displayName;
  if (fields.photoUrl !== undefined) {
    if (!isValidPhotoUrl(fields.photoUrl)) {
      const err = Object.assign(
        new Error('photoUrl must be an https URL (≤2 KB) or base64 image/jpeg|png|webp (≤2 KB).'),
        { statusCode: 400 }
      );
      throw err;
    }
    updates.photoUrl = fields.photoUrl;
  }
  // A photo and a preset avatar are mutually exclusive: choosing one clears
  // the other, so every client shows the same picture.
  const unset: Record<string, ''> = {};
  if (fields.avatarId !== undefined) {
    if (fields.avatarId === null) {
      unset.avatarId = '';
    } else if (isAvatarId(fields.avatarId)) {
      updates.avatarId = fields.avatarId;
      if (fields.photoUrl === undefined) unset.photoUrl = '';
    } else {
      throw Object.assign(new Error('Unknown avatarId.'), { statusCode: 400 });
    }
  } else if (fields.photoUrl !== undefined) {
    unset.avatarId = '';
  }
  if (fields.gender !== undefined) updates.gender = fields.gender;
  if (fields.birthDate !== undefined) updates.birthDate = new Date(fields.birthDate);
  if (fields.firstName !== undefined) updates.firstName = fields.firstName;
  if (fields.lastName !== undefined) updates.lastName = fields.lastName;
  if (fields.occupation !== undefined) updates.occupation = fields.occupation;
  if (fields.bio !== undefined) updates.bio = fields.bio;
  if (fields.city !== undefined) updates.city = fields.city;
  if (fields.country !== undefined) updates.country = fields.country;
  if (fields.hijriOffset !== undefined) {
    (updates as Record<string, unknown>).hijriOffset = fields.hijriOffset ?? 0;
    (updates as Record<string, unknown>).hijriOffsetSet = fields.hijriOffset !== null;
  }
  if (fields.dayStartMode !== undefined)
    (updates as Record<string, unknown>).dayStartMode = fields.dayStartMode;
  if (fields.aiEnabled !== undefined) updates.aiEnabled = fields.aiEnabled;
  if (fields.onboarded) {
    // Separate conditional write so a repeat call keeps the first timestamp.
    await User.updateOne({ uid, onboardedAt: null }, { $set: { onboardedAt: new Date() } });
  }

  return User.findOneAndUpdate(
    { uid },
    Object.keys(unset).length ? { $set: updates, $unset: unset } : updates,
    { new: true, runValidators: true }
  );
}
