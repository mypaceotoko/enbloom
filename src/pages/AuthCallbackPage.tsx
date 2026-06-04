import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { clearDemoMode } from '../lib/demoSession';
import { getPendingInviteCode } from '../lib/inviteSession';
import { ensureProfileForUser, profileRowToCurrentUser } from '../lib/profileApi';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isSupabaseMode, refreshSession } = useAuth();
  const { completeOnboarding, saveCurrentUserProfile } = useAppState();
  const { themeId } = useTheme();
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      if (!isSupabaseMode) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const session = await refreshSession();
        if (!session?.user) {
          throw new Error('ログインセッションを確認できませんでした。');
        }

        clearDemoMode();
        const profile = await ensureProfileForUser(session.user);
        const currentUserProfile = profileRowToCurrentUser(profile, themeId);
        const hasOfficialMemberAccess = Boolean(profile.onboarding_completed && (profile.invited_by || profile.invite_code_used));
        if (getPendingInviteCode() && !hasOfficialMemberAccess) {
          saveCurrentUserProfile(currentUserProfile);
          navigate('/onboarding', { replace: true });
          return;
        }

        if (profile.onboarding_completed) {
          completeOnboarding(currentUserProfile);
          navigate('/home', { replace: true });
          return;
        }

        saveCurrentUserProfile(currentUserProfile);
        navigate('/onboarding', { replace: true });
      } catch (caughtError) {
        if (!mounted) return;
        setError(caughtError instanceof Error ? caughtError.message : 'ログイン処理中にエラーが発生しました。');
      }
    }

    void handleCallback();

    return () => {
      mounted = false;
    };
  }, [completeOnboarding, isSupabaseMode, navigate, refreshSession, saveCurrentUserProfile, themeId]);

  return (
    <section className="flex min-h-screen items-center px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Card className="space-y-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-theme-main-dark">Auth Callback</p>
          <h1 className="text-xl font-black">Googleログインを確認しています</h1>
          <p className="text-sm leading-6 text-theme-muted">プロフィール状態を確認し、次の画面へ移動します。</p>
          {error ? (
            <div className="space-y-3 rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">
              <p>{error}</p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                ログインへ戻る
              </Button>
              <Link className="text-theme-main-dark underline" to="/login">ログイン画面へ戻る</Link>
            </div>
          ) : (
            <div className="mx-auto size-10 animate-pulse rounded-full bg-theme-accent-soft" />
          )}
        </Card>
      </div>
    </section>
  );
}
