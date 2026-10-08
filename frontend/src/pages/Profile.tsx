import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore.js';
import { auth, googleProvider } from '../firebase.js';
import { browserPopupRedirectResolver, linkWithPopup, unlink, AuthError } from 'firebase/auth';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import {
  requestError,
  useLinkGoogle,
  useSetPrimaryEmail,
  useUnlinkGoogle,
  useUpdateProfile,
  useUserProfile,
} from '../hooks/useUserProfile.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import {
  COUNTRIES_CITIES,
  calcFullAge,
  formatFullDate,
  ProfileData,
} from '../components/profile/profileParts.js';
import ProfileAvatarPicker from '../components/profile/ProfileAvatarPicker.js';
import ProfilePhotoChoiceModal from '../components/profile/ProfilePhotoChoiceModal.js';
import ProfileEditForm from '../components/profile/ProfileEditForm.js';
import ProfileAccountCard from '../components/profile/ProfileAccountCard.js';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import { LinkSlashIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const { data: analyticsData } = useAnalytics(1);

  const googleFirstName = useMemo(() => {
    const parts = (user?.displayName ?? '').trim().split(' ');
    return parts[0] ?? '';
  }, [user?.displayName]);
  const googleLastName = useMemo(() => {
    const parts = (user?.displayName ?? '').trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }, [user?.displayName]);

  const [profile, setProfile] = useState<ProfileData>({
    displayName: user?.displayName || '',
    firstName: '',
    lastName: '',
    photoUrl: user?.photoUrl || '',
    gender: '',
    birthDate: '',
    occupation: '',
    bio: '',
    city: '',
    country: '',
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  // Fresh on every visit: the edit form starts from the server's copy.
  const { data: dbUser, isFetchedAfterMount } = useUserProfile({ fresh: true });
  const updateProfile = useUpdateProfile();
  const linkGoogleMut = useLinkGoogle();
  const unlinkGoogleMut = useUnlinkGoogle();
  const setPrimaryEmailMut = useSetPrimaryEmail();
  const formLoaded = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(user?.photoUrl || '');
  const [avatarId, setAvatarId] = useState<string | null>(user?.avatarId ?? null);
  const [showPhotoChoice, setShowPhotoChoice] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  /** providerUid waiting for the Disconnect confirmation. */
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const [accountError, setAccountError] = useState('');
  const [primaryEmailLoading, setPrimaryEmailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveSuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load prayer-times location for city/country pre-fill
  const locationFromStorage = useMemo(() => {
    try {
      const s = localStorage.getItem('bustandeen_location');
      if (!s) return null;
      return JSON.parse(s) as { latitude: number; longitude: number; name?: string };
    } catch {
      return null;
    }
  }, []);

  // Fill the form once, from the first fresh copy (later cache writes from the
  // mutations below must not overwrite what the user is typing).
  useEffect(() => {
    if (!isFetchedAfterMount || !dbUser || formLoaded.current) return;
    formLoaded.current = true;
    let city = dbUser.city || '';
    let country = dbUser.country || '';
    if (!city && !country && locationFromStorage?.name) {
      const parts = locationFromStorage.name.split(', ');
      if (parts.length >= 2) {
        city = parts[0] ?? '';
        country = parts[parts.length - 1] ?? '';
      }
    }
    const loaded: ProfileData = {
      displayName: dbUser.displayName || user?.displayName || '',
      firstName: dbUser.firstName || googleFirstName,
      lastName: dbUser.lastName || googleLastName,
      photoUrl: dbUser.photoUrl || user?.photoUrl || '',
      gender: dbUser.gender || '',
      birthDate: dbUser.birthDate ? dbUser.birthDate.substring(0, 10) : '',
      occupation: dbUser.occupation || '',
      bio: dbUser.bio || '',
      city,
      country,
    };
    setProfile(loaded);
    setOriginalProfile(loaded);
    setPreview(dbUser.photoUrl || (dbUser.avatarId ? '' : user?.photoUrl) || '');
    setAvatarId(dbUser.avatarId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the fresh copy arrives; the other values are read at that moment on purpose
  }, [isFetchedAfterMount, dbUser]);

  const isDirty = useMemo(() => {
    if (!originalProfile) return false;
    return (Object.keys(profile) as Array<keyof ProfileData>).some(
      (k) => profile[k] !== originalProfile[k]
    );
  }, [profile, originalProfile]);

  const saveProfile = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const saved = await updateProfile.mutateAsync({
        displayName: profile.displayName || undefined,
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        // The picture is saved on its own when it is chosen (choosePicture).
        gender: profile.gender || undefined,
        birthDate: profile.birthDate || undefined,
        occupation: profile.occupation || undefined,
        bio: profile.bio || undefined,
        city: profile.city || undefined,
        country: profile.country || undefined,
      });
      setOriginalProfile({ ...profile });
      const updatedAuthUser = {
        ...(user ?? { uid: '', email: null }),
        displayName: saved?.displayName || profile.displayName,
        photoUrl: saved ? (saved.photoUrl ?? null) : (user?.photoUrl ?? null),
        avatarId: saved ? (saved.avatarId ?? null) : (user?.avatarId ?? null),
        // Gender gates the Rayhanah Cycle menu entry — reflect it immediately
        gender: (saved?.gender || profile.gender || undefined) as
          'male' | 'female' | 'other' | 'prefer_not_say' | undefined,
      };
      setUser(updatedAuthUser);
      localStorage.setItem(
        'bustandeen_user',
        JSON.stringify({
          ...JSON.parse(localStorage.getItem('bustandeen_user') || '{}'),
          displayName: updatedAuthUser.displayName,
          photoUrl: updatedAuthUser.photoUrl,
          avatarId: updatedAuthUser.avatarId,
          gender: updatedAuthUser.gender,
        })
      );
      setSaveSuccess(true);
      if (saveSuccessTimeout.current) clearTimeout(saveSuccessTimeout.current);
      saveSuccessTimeout.current = setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      // No reply at all is the connection; a reply (or `ok: false`) is a failed save.
      setSaveError(
        requestError(err).offline
          ? t('profile.saveFailedConnection', 'Failed to save. Please check your connection.')
          : t('profile.saveFailed', 'Save failed. Please try again.')
      );
    }
    setSaving(false);
  };

  // Saves the profile picture: the Google photo (an https URL) or a preset
  // avatar id. Photos are never uploaded (Firebase Storage is not enabled);
  // the server keeps the two mutually exclusive.
  const choosePicture = async (choice: { photoUrl: string } | { avatarId: string }) => {
    setSaveError('');
    setUploading(true);
    const nextPhoto = 'photoUrl' in choice ? choice.photoUrl : '';
    const nextAvatar = 'avatarId' in choice ? choice.avatarId : null;
    const prev = { preview, avatarId };
    setPreview(nextPhoto);
    setAvatarId(nextAvatar);
    try {
      await updateProfile.mutateAsync(choice);
      setProfile((p) => ({ ...p, photoUrl: nextPhoto }));
      setOriginalProfile((p) => (p ? { ...p, photoUrl: nextPhoto } : null));
      const updated = {
        ...(user ?? { uid: '', email: null }),
        displayName: user?.displayName ?? null,
        photoUrl: nextPhoto || null,
        avatarId: nextAvatar,
      };
      setUser(updated);
      localStorage.setItem(
        'bustandeen_user',
        JSON.stringify({
          ...JSON.parse(localStorage.getItem('bustandeen_user') || '{}'),
          photoUrl: updated.photoUrl,
          avatarId: updated.avatarId,
        })
      );
    } catch {
      setPreview(prev.preview);
      setAvatarId(prev.avatarId);
      setSaveError(t('profile.pictureNotSaved', 'Could not save your picture. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const selectAvatar = async (id: string) => {
    setAvatarModalOpen(false);
    await choosePicture({ avatarId: id });
  };

  // Get Google profile photo from Firebase Auth provider data
  const googlePhotoUrl = useMemo(() => {
    return (
      auth.currentUser?.providerData.find((p) => p.providerId === 'google.com')?.photoURL ?? null
    );
  }, []);

  const applyGoogleAccountPhoto = async () => {
    if (!googlePhotoUrl) return;
    setShowPhotoChoice(false);
    await choosePicture({ photoUrl: googlePhotoUrl });
  };

  const linked = dbUser?.linkedProviders ?? [];
  const googleLinked = linked.find((p) => p.provider === 'google.com');
  // Also check Firebase-level provider data: Google sign-in users have google.com
  // in their providerData before the backend has stored it in linkedProviders.
  const firebaseHasGoogle =
    auth.currentUser?.providerData.some((p) => p.providerId === 'google.com') ?? false;
  const hasGoogle = !!googleLinked || firebaseHasGoogle;

  const linkGoogle = async () => {
    if (linkingGoogle || !auth.currentUser) return;
    setLinkingGoogle(true);
    setAccountError('');
    try {
      const result = await linkWithPopup(
        auth.currentUser,
        googleProvider,
        browserPopupRedirectResolver
      );
      const googleInfo = result.user.providerData.find((p) => p.providerId === 'google.com');
      if (!googleInfo) {
        setLinkingGoogle(false);
        return;
      }

      try {
        await linkGoogleMut.mutateAsync({
          googleEmail: googleInfo.email ?? '',
          googleUid: googleInfo.uid,
        });
      } catch (saveErr) {
        const { status, message } = requestError(saveErr);
        setAccountError(
          status === 409
            ? t(
                'profile.googleAlreadyLinkedOther',
                'This Google account is already linked to another Bustandeen account.'
              )
            : (message ??
                t('profile.linkSaveFailed', 'Failed to save linked account. Please try again.'))
        );
      }
    } catch (err) {
      const code = (err as AuthError).code ?? '';
      if (code === 'auth/credential-already-in-use') {
        setAccountError(
          t(
            'profile.googleAlreadyConnectedDifferent',
            'This Google account is already connected to a different Bustandeen account.'
          )
        );
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAccountError(
          t('profile.googleConnectFailed', 'Could not connect Google account. Please try again.')
        );
      }
    }
    setLinkingGoogle(false);
  };

  // Asked first in the ConfirmDialog (confirmUnlink), then run here.
  const unlinkGoogle = async (providerUid: string) => {
    setConfirmUnlink(null);
    setAccountError('');
    setUnlinkingGoogle(true);
    try {
      if (auth.currentUser) await unlink(auth.currentUser, 'google.com');
      await unlinkGoogleMut.mutateAsync(providerUid);
    } catch {
      /* non-fatal */
    }
    setUnlinkingGoogle(false);
  };

  const makePrimaryEmail = async (email: string) => {
    if (primaryEmailLoading) return;
    setPrimaryEmailLoading(true);
    try {
      // The reply carries the authoritative linkedProviders + primaryEmail.
      await setPrimaryEmailMut.mutateAsync(email);
    } catch {
      /* non-fatal */
    } finally {
      setPrimaryEmailLoading(false);
    }
  };

  const ageInfo = calcFullAge(profile.birthDate);
  const totalZikr = formatLocaleNumber(dbUser?.totalCount ?? 0);
  const longestStreak = analyticsData?.streak?.longestStreak ?? null;
  const memberSince = dbUser?.createdAt ? formatFullDate(dbUser.createdAt) : null;

  // Determine primary/secondary: if primaryEmail is not set, password account is default primary
  const explicitPrimary = dbUser?.primaryEmail ?? null;
  const googleIsPrimary =
    explicitPrimary !== null &&
    googleLinked !== undefined &&
    explicitPrimary === googleLinked.email &&
    explicitPrimary !== user?.email;

  // City list for selected country
  const cityOptions = profile.country ? (COUNTRIES_CITIES[profile.country] ?? []) : [];

  const handleCountryChange = (country: string) => {
    setProfile((p) => ({ ...p, country, city: '' }));
  };

  return (
    <>
      <AnimatedBackground variant="dark">
        <div className="p-4 sm:p-6 lg:p-8 pb-16">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* The arch hero and the stat tiles */}
            <ProfileSummaryCard
              ageInfo={ageInfo}
              longestStreak={longestStreak}
              memberSince={memberSince}
              preview={preview}
              avatarId={avatarId}
              profile={profile}
              setShowPhotoChoice={setShowPhotoChoice}
              totalZikr={totalZikr}
              uploading={uploading}
              user={user}
            />

            {/* Account & linked accounts */}
            <ProfileAccountCard
              accountError={accountError}
              firebaseHasGoogle={firebaseHasGoogle}
              googleIsPrimary={googleIsPrimary}
              googleLinked={googleLinked}
              linkGoogle={linkGoogle}
              linkingGoogle={linkingGoogle}
              makePrimaryEmail={makePrimaryEmail}
              primaryEmailLoading={primaryEmailLoading}
              unlinkGoogle={setConfirmUnlink}
              unlinkingGoogle={unlinkingGoogle}
              user={user}
            />

            {/* Edit form */}
            <ProfileEditForm
              ageInfo={ageInfo}
              cityOptions={cityOptions}
              googleFirstName={googleFirstName}
              googleLastName={googleLastName}
              handleCountryChange={handleCountryChange}
              isDirty={isDirty}
              profile={profile}
              saveError={saveError}
              saveProfile={saveProfile}
              saveSuccess={saveSuccess}
              saving={saving}
              setProfile={setProfile}
            />
          </div>
        </div>
      </AnimatedBackground>

      {/* Photo choice and avatar dialogs (portaled) */}
      <ProfilePhotoChoiceModal
        applyGoogleAccountPhoto={applyGoogleAccountPhoto}
        googleLinked={googleLinked}
        googlePhotoUrl={googlePhotoUrl}
        hasGoogle={hasGoogle}
        setAvatarModalOpen={setAvatarModalOpen}
        setShowPhotoChoice={setShowPhotoChoice}
        showPhotoChoice={showPhotoChoice}
        uploading={uploading}
      />

      <ProfileAvatarPicker
        avatarModalOpen={avatarModalOpen}
        selectAvatar={selectAvatar}
        selectedId={avatarId}
        setAvatarModalOpen={setAvatarModalOpen}
        uploading={uploading}
      />

      <ConfirmDialog
        open={confirmUnlink !== null}
        title={t('profile.disconnectGoogleTitle', 'Disconnect Google account?')}
        message={t(
          'profile.disconnectGoogleText',
          'You will no longer be able to sign in with this Google account.'
        )}
        confirmLabel={t('profile.disconnect', 'Disconnect')}
        onConfirm={() => confirmUnlink && void unlinkGoogle(confirmUnlink)}
        icon={<LinkSlashIcon className="w-6 h-6" />}
        onCancel={() => setConfirmUnlink(null)}
      />
    </>
  );
}
