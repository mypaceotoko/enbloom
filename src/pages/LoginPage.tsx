import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { isSupabaseMode, signInWithGoogle } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleLogin() {
    setError('');

    if (!isSupabaseMode) {
      navigate('/onboarding');
      return;
    }

    setSubmitting(true);
    try {
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
              <p className="text-xs font-black uppercase tracking-[0.22em] text-theme-main-dark">Welcome</p>
              {!isSupabaseMode ? <span className="rounded-full bg-theme-accent-soft px-2.5 py-1 text-[10px] font-black text-theme-main-dark">ローカルデモ</span> : null}
            </div>
            <h1 className="text-xl font-black">招待されたご縁から始める</h1>
            <p className="text-[13px] leading-5 text-theme-muted">
              {isSupabaseMode
                ? 'GoogleログインでConnectBloomを始めます。招待コードは次フェーズで本検証します。'
                : 'Supabase未接続のため、今まで通りlocalStorageのデモ体験で始められます。'}
            </p>
          </div>
          {error ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div> : null}
          <Button className="w-full bg-white text-theme-text ring-1 ring-theme-main/15" disabled={submitting} onClick={handleGoogleLogin} variant="ghost">
            <span className="flex size-5 items-center justify-center rounded-full bg-theme-main text-white text-xs font-black">G</span>
            {submitting ? 'Googleログインへ移動中...' : isSupabaseMode ? 'Googleでログイン' : 'Googleでログイン（デモ）'}
          </Button>
          <Input label="招待コード" name="inviteCode" onChange={(event) => setInviteCode(event.target.value)} placeholder="CONNECTBLOOM-XXXX" value={inviteCode} />
          <Button className="w-full" onClick={() => navigate('/onboarding')}>
            デモで始める
          </Button>
          <Button className="w-full" onClick={() => navigate('/home')} variant="secondary">
            オンボーディングをスキップ
          </Button>
        </Card>
      </div>
    </section>
  );
}
