import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export default function BackButton({ to, label, className = '' }: BackButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`btn btn-ghost btn-sm gap-1.5 text-white/70 hover:text-white hover:bg-white/10 ${className}`}
    >
      <ArrowLeftIcon className="w-4 h-4" />
      {label ?? t('common.back')}
    </button>
  );
}
