import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { enableDemoMode, clearDemoMode } from '../lib/demoSession';
import { validateInviteCode } from '../lib/inviteCodeApi';
import { clearPendingInviteCode, normalizeInviteCodeInput, setPendingInviteCode } from '../lib/inviteSession';

export function LoginPage() {
  const navigate = useNavigate();
  const { isSupabaseMode, signInWithGoogle } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleInviteCodeChange(value: string) {
    setInviteCode(normalizeInviteCodeInput(value));
    setError('');
    setStatusMessage('');
  }

  async function handleGoogleLogin() {
    setError('');
    setStatusMessage('');
    const normalizedInviteCode = normalizeInviteCodeInput(inviteCode);

    if (!isSupabaseMode) {
      if (normalizedInviteCode) setPendingInviteCode(normalizedInviteCode);
      clearDemoMode();
      navigate('/onboarding');
      return;
    }

    setSubmitting(true);
    try {
      if (normalizedInviteCode) {
        setStatusMessage('招待コードを確認しています。');
        const inviteValidation = await validateInviteCode(normalizedInviteCode);
        if (!inviteValidation.ok) {
          setError(inviteValidation.error);
          setSubmitting(false);
          setStatusMessage('');
          return;
        }
        setPendingInviteCode(inviteValidation.inviteCode.code);
        clearDemoMode();
        setStatusMessage('紹介コードを確認しました。Googleログイン後、紹介経路として記録されます。');
      } else {
        clearPendingInviteCode();
        clearDemoMode();
        setStatusMessage('Googleログインに進みます。主要機能の利用前に招待コードが必要です。');
      }
      await signInWithGoogle();
    } catch (caughtError) {
      setSubmitting(false);
      setError(caughtError instanceof Error ? caughtError.message : 'Googleログインを開始できませんでした。時間をおいて再度お試しください。');
    }
  }

  return (
    <section className="flex min-h-screen items-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Link className="inline-flex" to="/">
          <BrandLogo />
        </Link>
        <Card className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-theme-main-dark">Invite-only beta</p>
              {!isSupabaseMode ? <span className="rounded-full bg-theme-accent-soft px-2.5 py-1 text-[10px] font-black text-theme-main-dark">デモ</span> : null}
            </div>
            <h1 className="text-xl font-black">招待されたご縁から始める</h1>
            <div className="space-y-1 text-[13px] leading-5 text-theme-muted">
              <p>ConnectBloomは現在、招待制のβ版です。</p>
              <p>正式参加には招待コードが必要です。</p>
              <p>招待コードを入力すると、紹介経路として記録されます。</p>
            </div>
          </div>
          {error ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div> : null}
          {statusMessage ? <div className="rounded-[1.15rem] bg-theme-accent-soft/60 p-3 text-xs font-bold leading-5 text-theme-main-dark">{statusMessage}</div> : null}
          <Input
            helperText="招待コードを受け取った方は、コードを入力してからGoogleログインしてください。"
            label="招待コード"
            name="inviteCode"
            onChange={(event) => handleInviteCodeChange(event.target.value)}
            placeholder="招待コードを入力"
            value={inviteCode}
          />
          {inviteCode ? (
            <p className="rounded-[1.15rem] bg-theme-background/75 p-3 text-xs font-bold leading-5 text-theme-main-dark">
              この招待コードからの紹介として参加します。
            </p>
          ) : null}
          <Button className="w-full bg-white text-theme-text ring-1 ring-theme-main/15" disabled={submitting} onClick={handleGoogleLogin} variant="ghost">
            <span className="flex size-5 items-center justify-center rounded-full bg-theme-main text-xs font-black text-white">G</span>
            {submitting ? 'Googleログインへ移動中...' : 'Googleでログイン'}
          </Button>
          <Link className="block" onClick={enableDemoMode} to="/home">
            <Button className="w-full" variant="secondary">
              デモで雰囲気を見る
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-theme-main-dark">
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2" to="/safety">安心ガイド</Link>
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2" to="/test-guide">テスターガイド</Link>
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2" to="/terms">利用規約</Link>
            <Link className="rounded-xl bg-theme-background/70 px-3 py-2" to="/privacy">プライバシー</Link>
          </div>
        </Card>
      </div>
    </section>
  );
}
