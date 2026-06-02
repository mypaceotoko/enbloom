import type { ReactNode } from 'react';
import { ArrowRight, Bell, Languages, LogOut, Palette, ShieldCheck, UserRound, UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getSupabaseConnectionStatus } from '../lib/supabase';

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { resetDemoState } = useAppState();
  const { isAuthenticated, isSupabaseMode, signOut } = useAuth();
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const supabaseStatus = getSupabaseConnectionStatus();

  async function handleSignOut() {
    const confirmed = window.confirm('EnBloomからログアウトしますか？');
    if (!confirmed) return;

    setSigningOut(true);
    setNotice('');

    try {
      if (isSupabaseMode && isAuthenticated) {
        await signOut();
      } else {
        resetDemoState();
      }
      navigate('/login');
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? `ログアウトに失敗しました: ${caughtError.message}` : 'ログアウトに失敗しました。');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <PageShell description="テーマ設定のみlocalStorageへ保存します。他は将来実装のプレースホルダーです。" eyebrow="Settings" title="設定">
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/78 p-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-theme-main text-white"><Palette size={18} /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Current theme</p>
              <h2 className="text-lg font-black text-theme-text">{currentTheme.name}</h2>
            </div>
          </div>
          <p className="mt-2 text-[13px] leading-5 text-theme-muted">Natural / Sakura / Mint / Lavender / Night の5テーマを切り替えて、アプリの雰囲気を確認できます。</p>
        </div>
      </Card>

      {!isSupabaseMode || !isAuthenticated ? (
        <div className="rounded-full border border-theme-main/15 bg-theme-card/80 px-3 py-1.5 text-center text-[11px] font-black text-theme-main-dark shadow-sm">
          ローカルデモ / Supabase未接続
        </div>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{notice}</div> : null}


      <button className="w-full text-left transition active:scale-[0.99]" onClick={() => navigate('/my-profile')} type="button">
        <Card className="space-y-2 bg-theme-card/86 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark"><UserRound size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-theme-text">マイプロフィール</span>
              <span className="mt-0.5 block text-xs leading-5 text-theme-muted">登録したプロフィールを確認・編集できます。</span>
            </span>
            <ArrowRight className="shrink-0 text-theme-main-dark" size={18} />
          </div>
        </Card>
      </button>

      <SupabaseConnectionDebug status={supabaseStatus} />

      <Card className="space-y-3">
        <h2 className="text-sm font-black">テーマカラー</h2>
        <ThemeSwitcher />
      </Card>

      <Card className="space-y-3 bg-theme-card/86 py-3">
        <div className="flex gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark"><LogOut size={18} /></span>
          <span>
            <span className="block text-sm font-black">ログアウト</span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">Supabaseログイン時はセッションを終了し、デモ時はlocalStorageのデモ状態を初期化します。</span>
          </span>
        </div>
        <Button className="w-full" disabled={signingOut} onClick={handleSignOut} variant="secondary">
          {signingOut ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </Card>

      <Placeholder icon={<Languages size={18} />} title="言語設定" body="日本語 / 英語切り替えは将来実装予定です。" />
      <Placeholder icon={<Bell size={18} />} title="通知設定" body="マッチ・メッセージ通知の設定を次フェーズ以降に追加します。" />
      <Placeholder icon={<UserRoundCheck size={18} />} title="紹介者表示設定" body="紹介者名の表示範囲をユーザー設定として保存できるようにします。" />
      <Placeholder icon={<ShieldCheck size={18} />} title="安全設定" body="本人確認・年齢確認は次フェーズ以降の検討項目です。今回はUIのみです。" />
    </PageShell>
  );
}

function SupabaseConnectionDebug({
  status,
}: {
  status: ReturnType<typeof getSupabaseConnectionStatus>;
}) {
  const rows = [
    ['Supabase configured', String(status.isConfigured)],
    ['VITE_SUPABASE_URL exists', String(status.supabaseUrlExists)],
    ['VITE_SUPABASE_ANON_KEY exists', String(status.supabaseAnonKeyExists)],
    ['Supabase URL normalized', String(status.supabaseUrlNormalized)],
    ['Supabase URL has rest path', String(status.supabaseUrlHasRestPath)],
    ['Supabase anon key length exists', String(status.supabaseAnonKeyLengthExists)],
    ['Supabase anon key prefix type', status.supabaseAnonKeyPrefixType],
    ['Supabase client created', String(status.clientCreated)],
    ['Auth mode', status.authMode],
    ['Current origin', status.currentOrigin || '(server render)'],
    ['Redirect URL', status.redirectUrl || '(server render)'],
  ];

  return (
    <Card className="space-y-2 bg-theme-card/86 py-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">
          Developer status
        </p>
        <h2 className="text-sm font-black">Supabase接続ステータス</h2>
      </div>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([label, value]) => (
          <div className="flex items-start justify-between gap-3" key={label}>
            <dt className="shrink-0 font-bold text-theme-muted">{label}</dt>
            <dd className="break-all text-right font-black text-theme-text">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-5 text-theme-muted">
        環境変数の値やAPI key本体は表示しません。true / false とOAuthリダイレクト先だけを確認できます。
      </p>
    </Card>
  );
}

function Placeholder({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="flex gap-2.5 bg-theme-card/86 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">{icon}</span>
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{body}</span>
      </span>
    </Card>
  );
}
