import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useConnectFriend } from '../hooks/useSocial.js';
import { celebrateSmall } from '../utils/celebrate.js';

/**
 * Invite-link landing page: /connect/:code
 * Signed-in → connects automatically. Guest → sign-in gate that returns here
 * after auth (via the bustandeen_redirect mechanism in App.tsx).
 */
export default function ConnectFriend() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, authLoading } = useAuthStore();
  const connect = useConnectFriend();
  const { t } = useTranslation();

  const firedRef = useRef(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    friendName?: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading || !user || !code || firedRef.current) return;
    firedRef.current = true;
    connect.mutate(code, {
      onSuccess: (data) => {
        setResult(data);
        if (data.ok) celebrateSmall();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('connectFriend.invalidLink');
        setResult({ ok: false, message: msg });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [authLoading, user, code]);

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('connectFriend.srTitle')}</h1>
      <div className="min-h-[70vh] grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl border border-brand-border bg-brand-surface p-7 text-center space-y-4"
        >
          {authLoading ? (
            <>
              <span className="loading loading-spinner loading-lg text-brand-emerald" />
              <p className="text-white/40 text-sm">{t('connectFriend.preparing')}</p>
            </>
          ) : !user ? (
            /* Guest — sign in first, then we finish the connection */
            <>
              <div className="text-5xl">🤝</div>
              <h2 className="text-xl font-black text-white">{t('connectFriend.invited')}</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                {t('connectFriend.signInPrompt')}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-on-color border-0 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', `/connect/${code}`);
                    navigate('/login');
                  }}
                >
                  {t('common.signIn')}
                </button>
                <button
                  className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', `/connect/${code}`);
                    navigate('/signup');
                  }}
                >
                  {t('connectFriend.createAccount')}
                </button>
              </div>
            </>
          ) : connect.isPending || !result ? (
            <>
              <span className="loading loading-spinner loading-lg text-brand-emerald" />
              <p className="text-white/40 text-sm">{t('connectFriend.connecting')}</p>
              <p className="text-white/25 text-xs">{t('connectFriend.firstVisitNote')}</p>
            </>
          ) : result.ok ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="text-6xl"
              >
                🎉
              </motion.div>
              <h2 className="text-xl font-black text-brand-emerald">
                {result.message === 'You are already connected!'
                  ? t('connectFriend.alreadyConnected')
                  : t('connectFriend.connected')}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed">
                {t('connectFriend.connectedPre')}{' '}
                <b className="text-white/80">
                  {result.friendName ?? t('connectFriend.yourFriend')}
                </b>{' '}
                {t('connectFriend.connectedPost')}
              </p>
              <Link
                to="/friends"
                className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-on-color border-0 w-full"
              >
                🏁 {t('connectFriend.seeLeaderboard')}
              </Link>
            </>
          ) : (
            <>
              <div className="text-5xl">🔗</div>
              <h2 className="text-xl font-black text-white">{t('connectFriend.couldntConnect')}</h2>
              <p className="text-brand-gold/80 text-sm leading-relaxed">{result.message}</p>
              <Link
                to="/friends"
                className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
              >
                {t('connectFriend.goToFriends')}
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}
