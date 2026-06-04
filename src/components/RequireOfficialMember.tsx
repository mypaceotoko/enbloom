import { AlertCircle, BookOpen, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isDemoModeEnabled } from '../lib/demoSession';
import { getPendingInviteCode } from '../lib/inviteSession';
import { getMyProfile, type ProfileRow } from '../lib/profileApi';
import { Button } from './Button';
import { Card } from './Card';
import { PageShell } from './PageShell';

type MemberAccessState = 'checking' | 'allowed' | 'inviteRequired' | 'pendingInvite' | 'error';

function hasOfficialMemberAccess(profile: ProfileRow | null) {
  return Boolean(profile?.onboarding_completed && (profile.invited_by || profile.invite_code_used));
}

const demoAllowedPathPatterns = [
  /^\/home\/?$/,
  /^\/discover\/?$/,
  /^\/board\/?$/,
  /^\/board\/[^/]+\/?$/,
  /^\/rooms\/?$/,
  /^\/rooms\/[^/]+\/?$/,
  /^\/profile\/[^/]+\/?$/,
  /^\/likes\/?$/,
  /^\/matches\/?$/,
];

function canBrowseDemoPath(pathname: string) {
  return demoAllowedPathPatterns.some((pattern) => pattern.test(pathname));
}

function InviteRequiredMessage({ detail }: { detail?: string }) {
  return (
    <PageShell
      description="ConnectBloomは、信頼できる紹介から始まる招待制コネクトSNSです。正式参加には招待コードが必要です。"
      eyebrow="Invite required"
      title="招待コードが必要です"
    >
      <Card className="flower-gradient border-0 p-1">
        <div className="space-y-4 rounded-[1.25rem] bg-theme-card/86 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
              <HeartHandshake size={22} />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-theme-text">招待コードが必要です</h2>
              <p className="text-sm font-bold leading-6 text-theme-muted">
                ConnectBloomは、信頼できる紹介から始まる招待制コネクトSNSです。正式参加するには、招待コードを入力してください。
              </p>
            </div>
          </div>
          <p className="rounded-[1.15rem] bg-theme-background/75 p-3 text-xs font-bold leading-5 text-theme-main-dark">
            招待コードを受け取った方は、コード入力後にGoogleログインへ進めます。
          </p>
          {detail ? (
            <div className="flex gap-2 rounded-[1.15rem] bg-theme-background/75 p-3 text-xs font-bold leading-5 text-theme-muted">
              <AlertCircle className="mt-0.5 text-theme-main-dark" size={16} />
              <span>{detail}</span>
            </div>
          ) : null}
          <Link className="block" to="/login">
            <Button className="w-full">招待コードを入力する</Button>
          </Link>
          <div className="grid gap-2 text-sm font-bold text-theme-main-dark">
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2.5" to="/">サービス紹介を見る</Link>
            <Link className="flex items-center gap-2 rounded-xl bg-theme-background/70 px-3 py-2.5" to="/safety"><ShieldCheck size={16} />安心ガイドを見る</Link>
            <Link className="flex items-center gap-2 rounded-xl bg-theme-background/70 px-3 py-2.5" to="/terms"><BookOpen size={16} />利用規約を見る</Link>
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2.5" to="/privacy">プライバシーポリシーを見る</Link>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

export function RequireOfficialMember() {
  const location = useLocation();
  const { isAuthenticated, isSupabaseMode, loading, user } = useAuth();
  const [state, setState] = useState<MemberAccessState>(isSupabaseMode ? 'checking' : 'allowed');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      if (!isSupabaseMode) {
        setState('allowed');
        return;
      }

      if (isDemoModeEnabled() && canBrowseDemoPath(location.pathname)) {
        setState('allowed');
        return;
      }

      if (loading) {
        setState('checking');
        return;
      }

      if (!isAuthenticated || !user) {
        setState('allowed');
        return;
      }

      setState('checking');
      setDetail('');
      try {
        const profile = await getMyProfile(user.id);
        if (!mounted) return;
        if (hasOfficialMemberAccess(profile)) {
          setState('allowed');
          return;
        }
        if (getPendingInviteCode()) {
          setState('pendingInvite');
          return;
        }
        setState('inviteRequired');
        setDetail(profile?.onboarding_completed
          ? 'プロフィール作成は確認できましたが、紹介経路の記録がまだ完了していません。招待コードを入力してください。'
          : 'プロフィール作成と招待コードの確認が完了すると、正式参加として主要機能を使えるようになります。');
      } catch (caughtError) {
        if (!mounted) return;
        setState('error');
        setDetail(caughtError instanceof Error ? caughtError.message : '参加状態を確認できませんでした。');
      }
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode, loading, location.pathname, user]);

  if (!isSupabaseMode) return <Outlet />;
  if (loading || state === 'checking') {
    return (
      <PageShell description="紹介経路とプロフィール状態を確認しています。" eyebrow="Checking" title="参加状態を確認しています">
        <Card className="py-8 text-center">
          <div className="mx-auto size-10 animate-pulse rounded-full bg-theme-accent-soft" />
        </Card>
      </PageShell>
    );
  }
  if (state === 'allowed') return <Outlet />;
  if (state === 'pendingInvite') return <Navigate replace state={{ from: location.pathname }} to="/onboarding" />;
  return <InviteRequiredMessage detail={detail} />;
}
