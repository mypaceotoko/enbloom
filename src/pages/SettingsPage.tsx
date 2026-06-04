import type { ReactNode } from 'react';
import { ArrowRight, Bell, ClipboardCheck, ClipboardList, DoorOpen, FileText, Flag, HeartHandshake, Languages, LockKeyhole, LogOut, MessageCircle, Palette, ShieldCheck, ShieldMinus, Sparkles, Ticket, UserRound, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { safeGetUnreadNotificationCount } from '../lib/notificationApi';

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { resetDemoState } = useAppState();
  const { isAuthenticated, isSupabaseMode, signOut } = useAuth();
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

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
          ローカルデモ
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
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Safety & operations</p>
          <h2 className="text-lg font-black text-theme-text">安心・運営</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">安心して使うためのガイドや管理機能を確認できます。</p>
        </div>
        <SettingsLink body="ConnectBloomを安心して使うためのルールとヒントを確認できます。" icon={<ShieldCheck size={18} />} onClick={() => navigate('/safety')} title="安心ガイド" />
        <SettingsLink body="テスト時に確認してほしい流れと、フィードバックの送り方をまとめています。" icon={<ClipboardCheck size={18} />} onClick={() => navigate('/test-guide')} title="テスターガイド" />
        <SettingsLink body="ConnectBloomを使うための基本ルールを確認できます。" icon={<FileText size={18} />} onClick={() => navigate('/terms')} title="利用規約" />
        <SettingsLink body="扱う情報と使い方について確認できます。" icon={<LockKeyhole size={18} />} onClick={() => navigate('/privacy')} title="プライバシーポリシー" />
        <SettingsLink body="ブロックした相手の確認・解除ができます。" icon={<ShieldMinus size={18} />} onClick={() => navigate('/blocked-users')} title="ブロック中のユーザー" />
        <SettingsLink body="βテスター向けの招待コードを作成・確認できます。" icon={<Ticket size={18} />} onClick={() => navigate('/admin')} title="招待コード管理" />
        <SettingsLink body="届いた通報の確認・対応を管理画面で行えます。" icon={<Flag size={18} />} onClick={() => navigate('/admin')} title="通報管理" />
      </section>

      <Placeholder icon={<Languages size={18} />} title="言語設定" body="日本語以外の表示は今後対応予定です。" />
      <Placeholder icon={<UserRoundCheck size={18} />} title="紹介者表示設定" body="紹介者名の表示範囲は今後対応予定です。" />
      <Placeholder icon={<ShieldCheck size={18} />} title="安心サポート設定" body="困った時のサポート導線は今後対応予定です。" />

      <Card className="space-y-3 border-white/40 bg-theme-card/72 py-3 shadow-sm">
        <div className="flex gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft/60 text-theme-main-dark"><LogOut size={18} /></span>
          <span>
            <span className="block text-sm font-black">ログアウト</span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">Googleログイン時はセッションを終了し、デモ時は体験用の状態を初期化します。</span>
          </span>
        </div>
        <Button className="w-full bg-theme-card/90 hover:bg-theme-accent-soft/70" disabled={signingOut} onClick={handleSignOut} variant="secondary">
          {signingOut ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </Card>

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
