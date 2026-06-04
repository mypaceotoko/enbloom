import type { ReactNode } from 'react';
import { ArrowRight, Bell, ChevronDown, ChevronUp, ClipboardCheck, ClipboardList, DoorOpen, Flag, HeartHandshake, Languages, LogOut, MessageCircle, Palette, ShieldCheck, ShieldMinus, Sparkles, Ticket, UserRound, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { safeGetUnreadNotificationCount } from '../lib/notificationApi';
import { getSupabaseConnectionStatus } from '../lib/supabase';

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { resetDemoState } = useAppState();
  const { isAuthenticated, isSupabaseMode, signOut } = useAuth();
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [showDeveloperStatus, setShowDeveloperStatus] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const supabaseStatus = getSupabaseConnectionStatus();

  useEffect(() => {
    let mounted = true;

    async function loadUnreadNotificationCount() {
      if (!isSupabaseMode || !isAuthenticated) {
        setUnreadNotificationCount(0);
        return;
      }

      const count = await safeGetUnreadNotificationCount();
      if (mounted) setUnreadNotificationCount(count);
    }

    void loadUnreadNotificationCount();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode]);

  async function handleSignOut() {
    const confirmed = window.confirm('ConnectBloomからログアウトしますか？');
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
    <PageShell description="通知・活動管理・テーマをまとめて確認できます。" eyebrow="Settings" title="設定">
      {!isSupabaseMode || !isAuthenticated ? (
        <div className="rounded-full border border-theme-main/15 bg-theme-card/80 px-3 py-1.5 text-center text-[11px] font-black text-theme-main-dark shadow-sm">
          ローカルデモ / Supabase未接続
        </div>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{notice}</div> : null}

      <SettingsLink body="登録したプロフィールを確認・編集できます。" icon={<UserRound size={18} />} onClick={() => navigate('/my-profile')} title="マイプロフィール" />
      <SettingsLink body={`現在のテーマ: ${currentTheme.name}`} icon={<Palette size={18} />} onClick={() => navigate('/settings/theme')} title="テーマカラー" />

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Activity management</p>
          <h2 className="text-lg font-black text-theme-text">活動管理</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">募集・参加希望・通知・会話をまとめて確認できます。</p>
        </div>
        <SettingsLink badge={unreadNotificationCount > 0 ? `未読 ${unreadNotificationCount}件` : '通知はありません'} body="参加希望・承認・メッセージを確認できます。" icon={<Bell size={18} />} onClick={() => navigate('/notifications')} title="通知" />
        <SettingsLink body="募集・参加希望・通知・会話への導線を1か所で確認できます。" icon={<Sparkles size={18} />} onClick={() => navigate('/my-activity')} title="マイアクティビティ" />
        <SettingsLink body="投稿した募集と届いた参加希望を管理できます。" icon={<ClipboardList size={18} />} onClick={() => navigate('/my-board')} title="自分の募集" />
        <SettingsLink body="自分が送った参加希望の状態を確認・取り消しできます。" icon={<HeartHandshake size={18} />} onClick={() => navigate('/my-interests')} title="参加希望した募集" />
        <SettingsLink body="承認後につながったコネクトとDMを確認できます。" icon={<MessageCircle size={18} />} onClick={() => navigate('/matches')} title="コネクト一覧" />
        <SettingsLink body="参加中のルームと会話を確認できます。" icon={<DoorOpen size={18} />} onClick={() => navigate('/rooms')} title="ルーム" />
        <SettingsLink body="テスト時に確認してほしい流れをまとめています。" icon={<ClipboardCheck size={18} />} onClick={() => navigate('/test-guide')} title="テスターガイド" />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Safety & operations</p>
          <h2 className="text-lg font-black text-theme-text">安心・運営</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">安心して使うためのガイドや管理機能を確認できます。</p>
        </div>
        <SettingsLink body="ConnectBloomを安心して使うためのルールとヒントを確認できます。" icon={<ShieldCheck size={18} />} onClick={() => navigate('/safety')} title="安心ガイド" />
        <SettingsLink body="ブロックした相手の確認・解除ができます。" icon={<ShieldMinus size={18} />} onClick={() => navigate('/blocked-users')} title="ブロック中のユーザー" />
        <SettingsLink body="あなたのご縁から参加する人のために、招待コードを作成・確認できます。" icon={<Ticket size={18} />} onClick={() => navigate('/admin')} title="招待コード管理" />
        <SettingsLink body="届いた通報の確認・対応を管理画面で行えます。" icon={<Flag size={18} />} onClick={() => navigate('/admin')} title="通報管理" />
      </section>

      <Placeholder icon={<Languages size={18} />} title="言語設定" body="日本語 / 英語切り替えは将来実装予定です。" />
      <Placeholder icon={<UserRoundCheck size={18} />} title="紹介者表示設定" body="紹介者名の表示範囲をユーザー設定として保存できるようにします。" />
      <Placeholder icon={<ShieldCheck size={18} />} title="安心サポート設定" body="本人確認・年齢確認は次フェーズ以降の検討項目です。今回はUIのみです。" />

      <Card className="space-y-3 border-white/40 bg-theme-card/72 py-3 shadow-sm">
        <div className="flex gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft/60 text-theme-main-dark"><LogOut size={18} /></span>
          <span>
            <span className="block text-sm font-black">ログアウト</span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">Supabaseログイン時はセッションを終了し、デモ時はlocalStorageのデモ状態を初期化します。</span>
          </span>
        </div>
        <Button className="w-full bg-theme-card/90 hover:bg-theme-accent-soft/70" disabled={signingOut} onClick={handleSignOut} variant="secondary">
          {signingOut ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </Card>

      <div className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          aria-expanded={showDeveloperStatus}
          className="mx-auto flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black text-theme-muted transition hover:bg-theme-card/70 hover:text-theme-main-dark active:scale-[0.98]"
          onClick={() => setShowDeveloperStatus((current) => !current)}
          type="button"
        >
          {showDeveloperStatus ? '開発ステータスを閉じる' : '開発ステータスを表示'}
          {showDeveloperStatus ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showDeveloperStatus ? <SupabaseConnectionDebug status={supabaseStatus} /> : null}
      </div>
    </PageShell>
  );
}

function SettingsLink({ badge, body, icon, onClick, title }: { badge?: string; body: string; icon: ReactNode; onClick: () => void; title: string }) {
  return (
    <button className="w-full text-left transition active:scale-[0.99]" onClick={onClick} type="button">
      <Card className="space-y-2 border-theme-main/15 bg-theme-card/86 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-main/10 text-theme-main-dark">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-black text-theme-text">
              {title}
              {badge ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${badge.startsWith('未読') ? 'bg-theme-main text-white' : 'bg-theme-accent-soft text-theme-main-dark'}`}>{badge}</span> : null}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{body}</span>
          </span>
          <ArrowRight className="shrink-0 text-theme-main-dark" size={18} />
        </div>
      </Card>
    </button>
  );
}

function SupabaseConnectionDebug({ status }: { status: ReturnType<typeof getSupabaseConnectionStatus> }) {
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
    <Card className="mt-2 space-y-2 bg-theme-card/86 py-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Developer status</p>
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
      <p className="text-[11px] leading-5 text-theme-muted">環境変数の値やAPI key本体は表示しません。true / false とOAuthリダイレクト先だけを確認できます。</p>
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
