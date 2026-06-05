import { AlertCircle, BookOpen, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { isDemoModeEnabled } from '../lib/demoSession';
import { getSafeErrorLog } from '../lib/errorMessage';
import { getPendingInviteCode } from '../lib/inviteSession';
import { getMyProfile, type ProfileRow } from '../lib/profileApi';
import { Button } from './Button';
import { Card } from './Card';
import { PageShell } from './PageShell';

type MemberAccessState = 'checking' | 'allowed' | 'inviteRequired' | 'pendingInvite' | 'suspended' | 'error';

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


function SuspendedAccountMessage({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { t } = useLanguage();

  return (
    <PageShell
      description={t('account.suspended.body')}
      eyebrow="Account status"
      title={t('account.suspended.title')}
    >
      <Card className="flower-gradient border-0 p-1">
        <div className="space-y-4 rounded-[1.25rem] bg-theme-card/86 p-4 text-center backdrop-blur">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
            <ShieldCheck size={24} />
          </span>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-theme-text">{t('account.suspended.title')}</h2>
            <p className="text-sm font-bold leading-6 text-theme-muted">
              {t('account.suspended.body')}
            </p>
          </div>
          <div className="grid gap-2 text-sm font-bold text-theme-main-dark sm:grid-cols-3">
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2.5" to="/safety">{t('account.suspended.safety')}</Link>
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2.5" to="/terms">{t('account.suspended.terms')}</Link>
            <Button className="w-full" onClick={() => { void onSignOut(); }} type="button" variant="secondary">{t('settings.logout.button')}</Button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

function InviteRequiredMessage({ detail }: { detail?: string }) {
  const { t } = useLanguage();

  return (
    <PageShell
      description={t('officialMember.inviteRequired.description')}
      eyebrow={t('officialMember.inviteRequired.eyebrow')}
      title={t('officialMember.inviteRequired.title')}
    >
      <Card className="flower-gradient border-0 p-1">
        <div className="space-y-4 rounded-[1.25rem] bg-theme-card/86 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
              <HeartHandshake size={22} />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-theme-text">{t('officialMember.inviteRequired.title')}</h2>
              <p className="text-sm font-bold leading-6 text-theme-muted">
                {t('officialMember.inviteRequired.body')}
              </p>
            </div>
          </div>
          <p className="rounded-[1.15rem] bg-theme-background/75 p-3 text-xs font-bold leading-5 text-theme-main-dark">
            {t('officialMember.inviteRequired.loginNote')}
          </p>
          {detail ? (
            <div className="flex gap-2 rounded-[1.15rem] bg-theme-background/75 p-3 text-xs font-bold leading-5 text-theme-muted">
              <AlertCircle className="mt-0.5 text-theme-main-dark" size={16} />
              <span>{detail}</span>
            </div>
          ) : null}
          <Link className="block" to="/login">
            <Button className="w-full">{t('officialMember.inviteRequired.enterCode')}</Button>
          </Link>
          <div className="grid gap-2 text-sm font-bold text-theme-main-dark">
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2.5" to="/">{t('officialMember.inviteRequired.service')}</Link>
            <Link className="flex items-center gap-2 rounded-xl bg-theme-background/70 px-3 py-2.5" to="/safety"><ShieldCheck size={16} />{t('officialMember.inviteRequired.safety')}</Link>
            <Link className="flex items-center gap-2 rounded-xl bg-theme-background/70 px-3 py-2.5" to="/terms"><BookOpen size={16} />{t('officialMember.inviteRequired.terms')}</Link>
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2.5" to="/privacy">{t('officialMember.inviteRequired.privacy')}</Link>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

export function RequireOfficialMember() {
  const location = useLocation();
  const { isAuthenticated, isSupabaseMode, loading, signOut, user } = useAuth();
  const { t } = useLanguage();
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
        const accountStatus = profile?.account_status ?? 'active';
        if (accountStatus === 'suspended') {
          setState('suspended');
          return;
        }
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
          ? t('officialMember.inviteRequired.detailProfileDone')
          : t('officialMember.inviteRequired.detailProfilePending'));
      } catch (caughtError) {
        console.error('[RequireOfficialMember] access check failed', getSafeErrorLog(caughtError, 'official_member_check'));
        if (!mounted) return;
        setState('error');
        setDetail(t('officialMember.inviteRequired.detailCheckFailed'));
      }
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode, loading, location.pathname, t, user]);

  if (!isSupabaseMode) return <Outlet />;
  if (loading || state === 'checking') {
    return (
      <PageShell description={t('officialMember.checking.description')} eyebrow={t('officialMember.checking.eyebrow')} title={t('officialMember.checking.title')}>
        <Card className="py-8 text-center">
          <div className="mx-auto size-10 animate-pulse rounded-full bg-theme-accent-soft" />
        </Card>
      </PageShell>
    );
  }
  if (state === 'allowed') return <Outlet />;
  if (state === 'pendingInvite') return <Navigate replace state={{ from: location.pathname }} to="/onboarding" />;
  if (state === 'suspended') return <SuspendedAccountMessage onSignOut={signOut} />;
  return <InviteRequiredMessage detail={detail} />;
}
