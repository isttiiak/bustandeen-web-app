import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { BTN_PRIMARY, BTN_QUIET, BTN_SECONDARY, DIALOG } from './bustanStyles.js';

export default function UnsavedWarning() {
  const { t } = useTranslation();
  const { counts } = useZikrStore();
  const { user, authLoading } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const anyUnsaved = Object.values(counts || {}).some((c) => (c || 0) > 0);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('bustandeen_unsaved_dismissed') === '1';
    const onAuthPage = ['/login', '/signup'].includes(location.pathname);
    // The counter has its own guest prompt, and this card would cover Count.
    const onCounter = location.pathname === '/zikr';
    if (!authLoading && !user && anyUnsaved && !dismissed && !onAuthPage && !onCounter) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [user, anyUnsaved, location.pathname, authLoading]);

  useEffect(() => {
    if (!anyUnsaved) sessionStorage.removeItem('bustandeen_unsaved_dismissed');
  }, [anyUnsaved]);

  if (!visible) return null;

  return (
    <section
      aria-labelledby="unsaved-warning-title"
      className={`${DIALOG} fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md p-4`}
    >
      <h2 id="unsaved-warning-title" className="font-display text-white font-bold text-base">
        {t('unsavedWarning.title')}
      </h2>
      <p className="text-white/75 text-sm leading-relaxed mt-1">{t('unsavedWarning.message')}</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          className={BTN_PRIMARY}
          onClick={() => {
            sessionStorage.setItem('bustandeen_redirect', location.pathname);
            navigate('/login');
          }}
        >
          {t('unsavedWarning.logIn')}
        </button>
        <button
          className={BTN_SECONDARY}
          onClick={() => {
            sessionStorage.setItem('bustandeen_redirect', location.pathname);
            navigate('/signup');
          }}
        >
          {t('unsavedWarning.signUp')}
        </button>
        <button
          className={`${BTN_QUIET} col-span-2`}
          onClick={() => {
            sessionStorage.setItem('bustandeen_unsaved_dismissed', '1');
            setVisible(false);
          }}
        >
          {t('unsavedWarning.dismiss')}
        </button>
      </div>
    </section>
  );
}
