import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAuthStore } from '../store/useAuthStore.js';

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
    if (!authLoading && !user && anyUnsaved && !dismissed && !onAuthPage) {
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
    <div className="toast toast-center z-50">
      <div className="alert alert-warning items-start">
        <div className="flex-1">
          <h3 className="font-bold">{t('unsavedWarning.title')}</h3>
          <div className="text-sm">{t('unsavedWarning.message')}</div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            className="btn btn-sm"
            onClick={() => {
              sessionStorage.setItem('bustandeen_redirect', location.pathname);
              navigate('/signup');
            }}
          >
            {t('unsavedWarning.signUp')}
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              sessionStorage.setItem('bustandeen_redirect', location.pathname);
              navigate('/login');
            }}
          >
            {t('unsavedWarning.logIn')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              sessionStorage.setItem('bustandeen_unsaved_dismissed', '1');
              setVisible(false);
            }}
          >
            {t('unsavedWarning.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
