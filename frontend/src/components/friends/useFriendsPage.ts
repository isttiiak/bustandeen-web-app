import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCircleAllTime, useSocialSummary, type FriendStats } from '../../hooks/useSocial.js';
import type { Board } from './CircleRow.js';

/** The Friends screen's state: which dialogs are open, the invite link, the board tab. */
export function useFriendsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useSocialSummary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [nudgeHistoryOpen, setNudgeHistoryOpen] = useState(false);
  // The quiet friend being nudged (the compose sheet is open while set)
  const [nudgeTarget, setNudgeTarget] = useState<FriendStats | null>(null);
  const [copied, setCopied] = useState(false);

  // The navbar "Connect a friend" button links to /friends?invite=1
  useEffect(() => {
    if (searchParams.get('invite') === '1') {
      setInviteOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const inviteLink = data?.inviteCode ? `${window.location.origin}/connect/${data.inviteCode}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(t('friends.shareMessage', { link: inviteLink }));
      setCopied(true);
      toast.success(t('friends.inviteCopied'), { id: 'invite-copy' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('friends.copyError'));
    }
  };

  // "Today" is the live daily Noor; "This week" is the Friday-to-Thursday
  // average, so someone who started late (or had a quiet day) still shows effort.
  const [board, setBoard] = useState<Board>('today');
  const allTime = useCircleAllTime(board === 'all');
  // Server order: you first, then friends by longest streak. Never ranked
  // (FIQH-03): ordering by Noor would also reveal the score of anyone who
  // shares consistency only.
  const circle = data?.circle ?? [];
  const friendsCount = Math.max(0, circle.length - 1);

  return {
    data,
    isLoading,
    isError,
    refetch,
    inviteOpen,
    setInviteOpen,
    manageOpen,
    setManageOpen,
    privacyOpen,
    setPrivacyOpen,
    requestsOpen,
    setRequestsOpen,
    nudgeTarget,
    setNudgeTarget,
    nudgeHistoryOpen,
    setNudgeHistoryOpen,
    copied,
    inviteLink,
    copyLink,
    board,
    setBoard,
    allTime,
    circle,
    friendsCount,
  };
}
