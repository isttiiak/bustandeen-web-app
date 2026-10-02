import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { API_BASE, getIdToken } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { auth, googleProvider, storage } from '../firebase.js';
import { browserPopupRedirectResolver, linkWithPopup, unlink, AuthError } from 'firebase/auth';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import {
  COUNTRIES_CITIES,
  createAvatarDataUrl,
  calcFullAge,
  formatFullDate,
  ProfileData,
  DBUser,
  UserResponse,
} from '../components/profile/profileParts.js';
import ProfilePhotoPreviewModal from '../components/profile/ProfilePhotoPreviewModal.js';
import ProfileAvatarPicker from '../components/profile/ProfileAvatarPicker.js';
import ProfilePhotoChoiceModal from '../components/profile/ProfilePhotoChoiceModal.js';
import ProfileEditForm from '../components/profile/ProfileEditForm.js';
import ProfileAccountCard from '../components/profile/ProfileAccountCard.js';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard.js';

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
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(user?.photoUrl || '');
  const [showPhotoChoice, setShowPhotoChoice] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
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

  useEffect(() => {
    getIdToken()
      .then((idToken) => {
        if (!idToken) throw new Error('no session');
        return fetch(`${API_BASE}/api/user/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
      })
      .then((r) => r.json())
      .then((d: UserResponse) => {
        if (d?.user) {
          setDbUser(d.user);
          let city = d.user.city || '';
          let country = d.user.country || '';
          if (!city && !country && locationFromStorage?.name) {
            const parts = locationFromStorage.name.split(', ');
            if (parts.length >= 2) {
              city = parts[0] ?? '';
              country = parts[parts.length - 1] ?? '';
            }
          }
          const loaded: ProfileData = {
            displayName: d.user.displayName || user?.displayName || '',
            firstName: d.user.firstName || googleFirstName,
            lastName: d.user.lastName || googleLastName,
            photoUrl: d.user.photoUrl || user?.photoUrl || '',
            gender: d.user.gender || '',
            birthDate: d.user.birthDate ? d.user.birthDate.substring(0, 10) : '',
            occupation: d.user.occupation || '',
            bio: d.user.bio || '',
            city,
            country,
          };
          setProfile(loaded);
          setOriginalProfile(loaded);
          setPreview(d.user.photoUrl || user?.photoUrl || '');
        }
      })
      .catch(() => {
        /* non-fatal */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, []);

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
    const idToken = await getIdToken();
    if (!idToken) {
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/user/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          displayName: profile.displayName || undefined,
          firstName: profile.firstName || undefined,
          lastName: profile.lastName || undefined,
          // Only send photoUrl when it is an https URL (Firebase Storage).
          // Legacy users may still have a base64 data: URL in the DB — we don't
          // re-send it; the DB value stays as-is until they explicitly change
          // their photo via the upload flow.
          photoUrl:
            profile.photoUrl && profile.photoUrl.startsWith('https://')
              ? profile.photoUrl
              : undefined,
          gender: profile.gender || undefined,
          birthDate: profile.birthDate || undefined,
          occupation: profile.occupation || undefined,
          bio: profile.bio || undefined,
          city: profile.city || undefined,
          country: profile.country || undefined,
        }),
      });
      const data = (await res.json()) as UserResponse;
      if (data?.user) {
        setDbUser(data.user);
        setOriginalProfile({ ...profile });
        const updatedAuthUser = {
          ...(user ?? { uid: '', email: null }),
          displayName: data.user.displayName || profile.displayName,
          photoUrl: data.user.photoUrl || profile.photoUrl,
          // Gender gates the Rayhanah Cycle menu entry — reflect it immediately
          gender: (data.user.gender || profile.gender || undefined) as
            'male' | 'female' | 'other' | 'prefer_not_say' | undefined,
        };
        setUser(updatedAuthUser);
        localStorage.setItem(
          'bustandeen_user',
          JSON.stringify({
            ...JSON.parse(localStorage.getItem('bustandeen_user') || '{}'),
            displayName: updatedAuthUser.displayName,
            photoUrl: updatedAuthUser.photoUrl,
            gender: updatedAuthUser.gender,
          })
        );
        setSaveSuccess(true);
        if (saveSuccessTimeout.current) clearTimeout(saveSuccessTimeout.current);
        saveSuccessTimeout.current = setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(t('profile.saveFailed', 'Save failed. Please try again.'));
      }
    } catch {
      setSaveError(
        t('profile.saveFailedConnection', 'Failed to save. Please check your connection.')
      );
    }
    setSaving(false);
  };

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const src = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(src);
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(src);
            if (blob) resolve(blob);
            else reject(new Error('compression'));
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(src);
        reject(new Error('load'));
      };
      img.src = src;
    });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setSaveError('');
    try {
      const blob = await compressImage(file);
      setPhotoBlob(blob);
      setPhotoPreviewUrl(URL.createObjectURL(blob));
      setPhotoModalOpen(true);
    } catch {
      setSaveError(
        t('profile.imageProcessError', 'Could not process image. Try a different file.')
      );
    }
  };

  // Upload a blob to Firebase Storage at profile-photos/{uid}.jpg (overwrite).
  // Returns the public https download URL.
  const uploadBlobToStorage = async (blob: Blob): Promise<string> => {
    const uid = user?.uid;
    if (!uid) throw new Error('not authenticated');
    const fileRef = storageRef(storage, `profile-photos/${uid}.jpg`);
    await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(fileRef);
  };

  // Photos are uploaded directly to Firebase Storage; only the short https URL
  // is sent to PATCH /api/user/me (keeps the Mongo document small).
  const uploadPhoto = async () => {
    if (!photoBlob) return;
    setSaveError('');
    setUploading(true);
    try {
      setPhotoModalOpen(false);
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl('');

      const httpsUrl = await uploadBlobToStorage(photoBlob);
      setPhotoBlob(null);

      setPreview(httpsUrl);
      setProfile((p) => ({ ...p, photoUrl: httpsUrl }));

      const idToken = await getIdToken();
      if (idToken) {
        const res = await fetch(`${API_BASE}/api/user/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ photoUrl: httpsUrl }),
        });
        if (res.ok) {
          setOriginalProfile((p) => (p ? { ...p, photoUrl: httpsUrl } : null));
          const updated = {
            ...(user ?? { uid: '', email: null }),
            displayName: user?.displayName ?? null,
            photoUrl: httpsUrl,
          };
          setUser(updated);
          localStorage.setItem(
            'bustandeen_user',
            JSON.stringify({
              ...JSON.parse(localStorage.getItem('bustandeen_user') || '{}'),
              photoUrl: httpsUrl,
            })
          );
        } else {
          setSaveError(
            t(
              'profile.uploadedNotSaved',
              'Uploaded but could not save — click "Save Changes" to retry.'
            )
          );
        }
      }
    } catch {
      setSaveError(
        t('profile.uploadFailed', 'Upload failed. Check your connection and try again.')
      );
    } finally {
      setUploading(false);
    }
  };

  const cancelPhotoModal = () => {
    URL.revokeObjectURL(photoPreviewUrl);
    setPhotoModalOpen(false);
    setPhotoBlob(null);
    setPhotoPreviewUrl('');
  };

  const applyPhotoUrl = async (url: string) => {
    setSaveError('');
    setUploading(true);
    try {
      // Show optimistic preview immediately
      setPreview(url);

      // If url is a data: URI (emoji avatar canvas), upload it to Firebase Storage
      // first so the backend only ever sees a short https URL.
      let finalUrl = url;
      if (url.startsWith('data:')) {
        const res = await fetch(url);
        const blob = await res.blob();
        finalUrl = await uploadBlobToStorage(blob);
        setPreview(finalUrl);
      }

      setProfile((p) => ({ ...p, photoUrl: finalUrl }));
      const idToken = await getIdToken();
      if (idToken) {
        const res = await fetch(`${API_BASE}/api/user/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ photoUrl: finalUrl }),
        });
        if (res.ok) {
          setOriginalProfile((p) => (p ? { ...p, photoUrl: finalUrl } : null));
          const updated = {
            ...(user ?? { uid: '', email: null }),
            displayName: user?.displayName ?? null,
            photoUrl: finalUrl,
          };
          setUser(updated);
          localStorage.setItem(
            'bustandeen_user',
            JSON.stringify({
              ...JSON.parse(localStorage.getItem('bustandeen_user') || '{}'),
              photoUrl: finalUrl,
            })
          );
        }
      }
    } catch {
      /* non-fatal */
    } finally {
      setUploading(false);
    }
  };

  const selectAvatar = async (av: { emoji: string; bg: string }) => {
    const dataUrl = createAvatarDataUrl(av.emoji, av.bg);
    if (!dataUrl) return;
    setAvatarModalOpen(false);
    await applyPhotoUrl(dataUrl);
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
    await applyPhotoUrl(googlePhotoUrl);
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

      const idToken = await getIdToken();
      if (!idToken) {
        setLinkingGoogle(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/user/link-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ googleEmail: googleInfo.email ?? '', googleUid: googleInfo.uid }),
      });
      const data = (await res.json()) as { ok: boolean; user?: DBUser; error?: string };
      if (data.ok && data.user) {
        setDbUser(data.user);
      } else {
        const msg =
          res.status === 409
            ? t(
                'profile.googleAlreadyLinkedOther',
                'This Google account is already linked to another Bustandeen account.'
              )
            : (data.error ??
              t('profile.linkSaveFailed', 'Failed to save linked account. Please try again.'));
        await Swal.fire({
          title: t('profile.errorTitle', 'Error'),
          text: msg,
          icon: 'error',
          background: '#1a1812',
          color: '#f1f5f9',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-3xl border border-brand-border' },
        });
      }
    } catch (err) {
      const code = (err as AuthError).code ?? '';
      if (code === 'auth/credential-already-in-use') {
        await Swal.fire({
          title: t('profile.alreadyLinkedTitle', 'Already linked'),
          text: t(
            'profile.googleAlreadyConnectedDifferent',
            'This Google account is already connected to a different Bustandeen account.'
          ),
          icon: 'warning',
          background: '#1a1812',
          color: '#f1f5f9',
          confirmButtonColor: '#c9a96e',
          customClass: { popup: 'rounded-3xl border border-brand-border' },
        });
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        await Swal.fire({
          title: t('profile.errorTitle', 'Error'),
          text: t(
            'profile.googleConnectFailed',
            'Could not connect Google account. Please try again.'
          ),
          icon: 'error',
          background: '#1a1812',
          color: '#f1f5f9',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-3xl border border-brand-border' },
        });
      }
    }
    setLinkingGoogle(false);
  };

  const unlinkGoogle = async (providerUid: string) => {
    const confirm = await Swal.fire({
      title: t('profile.disconnectGoogleTitle', 'Disconnect Google account?'),
      text: t(
        'profile.disconnectGoogleText',
        'You will no longer be able to sign in with this Google account.'
      ),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('profile.disconnect', 'Disconnect'),
      cancelButtonText: t('common.cancel'),
      background: '#1a1812',
      color: '#f1f5f9',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3a3425',
      customClass: { popup: 'rounded-3xl border border-brand-border' },
    });
    if (!confirm.isConfirmed) return;
    setUnlinkingGoogle(true);
    try {
      if (auth.currentUser) await unlink(auth.currentUser, 'google.com');
      const idToken = await getIdToken();
      if (idToken) {
        const res = await fetch(`${API_BASE}/api/user/unlink-google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ providerUid }),
        });
        const data = (await res.json()) as { ok: boolean; user?: DBUser };
        if (data.ok && data.user) setDbUser(data.user);
      }
    } catch {
      /* non-fatal */
    }
    setUnlinkingGoogle(false);
  };

  const makePrimaryEmail = async (email: string) => {
    const idToken = await getIdToken();
    if (!idToken || primaryEmailLoading) return;
    setPrimaryEmailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/primary-email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return;
      // Re-fetch full user to get authoritative linkedProviders + primaryEmail state
      const meRes = await fetch(`${API_BASE}/api/user/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (meRes.ok) {
        const data = (await meRes.json()) as { user?: DBUser };
        if (data.user) setDbUser(data.user);
      }
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
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-4xl font-black text-brand-emerald mb-1">
                {t('profile.title', 'My Profile')}
              </h1>
              <p className="text-white/40 text-sm">
                {t('profile.subtitle', 'Manage your personal information')}
              </p>
            </motion.div>

            {/* ── Avatar + summary card ─── gradient with star animation */}
            <ProfileSummaryCard
              ageInfo={ageInfo}
              fileInputRef={fileInputRef}
              longestStreak={longestStreak}
              memberSince={memberSince}
              onFileChange={onFileChange}
              preview={preview}
              profile={profile}
              setShowPhotoChoice={setShowPhotoChoice}
              totalZikr={totalZikr}
              uploading={uploading}
              user={user}
            />

            {/* ── Account & Linked Accounts ── */}
            <ProfileAccountCard
              firebaseHasGoogle={firebaseHasGoogle}
              googleIsPrimary={googleIsPrimary}
              googleLinked={googleLinked}
              linkGoogle={linkGoogle}
              linkingGoogle={linkingGoogle}
              makePrimaryEmail={makePrimaryEmail}
              primaryEmailLoading={primaryEmailLoading}
              unlinkGoogle={unlinkGoogle}
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

      {/* ── Photo choice modal ── */}
      <ProfilePhotoChoiceModal
        applyGoogleAccountPhoto={applyGoogleAccountPhoto}
        fileInputRef={fileInputRef}
        googleLinked={googleLinked}
        googlePhotoUrl={googlePhotoUrl}
        hasGoogle={hasGoogle}
        setAvatarModalOpen={setAvatarModalOpen}
        setShowPhotoChoice={setShowPhotoChoice}
        showPhotoChoice={showPhotoChoice}
        uploading={uploading}
      />

      {/* ── Avatar selection modal ── */}
      <ProfileAvatarPicker
        avatarModalOpen={avatarModalOpen}
        selectAvatar={selectAvatar}
        setAvatarModalOpen={setAvatarModalOpen}
        uploading={uploading}
      />

      {/* ── Photo upload preview modal ── */}
      <ProfilePhotoPreviewModal
        cancelPhotoModal={cancelPhotoModal}
        photoModalOpen={photoModalOpen}
        photoPreviewUrl={photoPreviewUrl}
        uploadPhoto={uploadPhoto}
        uploading={uploading}
      />
    </>
  );
}
