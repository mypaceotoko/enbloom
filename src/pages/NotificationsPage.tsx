import { Bell, CheckCircle2, ChevronRight, Inbox, Loader2, MailCheck, MessageSquareText, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { useAuth } from '../hooks/useAuth';
import { getMyNotifications, getNotificationErrorMessage, markAllNotificationsRead, markNotificationRead } from '../lib/notificationApi';
import type { AppNotification, NotificationType } from '../types/notification';

function getTypeLabel(type: NotificationType) {
  if (type === 'activity_interest_received') return '参加希望';
  if (type === 'activity_interest_accepted') return '承認';
  return 'メッセージ';
}

function getTypeIcon(type: NotificationType) {
  if (type === 'activity_interest_received') return <UsersRound size={16} />;
  if (type === 'activity_interest_accepted') return <CheckCircle2 size={16} />;
  return <MessageSquareText size={16} />;
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const canUseSupabaseNotifications = isSupabaseMode && isAuthenticated;

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      setErrorMessage('');

      if (!isSupabaseMode) {
        setNotifications([]);
        return;
      }

      if (!isAuthenticated) {
        setNotifications([]);
        return;
      }

      setLoading(true);
      try {
        const nextNotifications = await getMyNotifications();
        if (!mounted) return;
        setNotifications(nextNotifications);
      } catch (caughtError) {
        if (!mounted) return;
        setNotifications([]);
        setErrorMessage(getNotificationErrorMessage(caughtError));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode]);

  async function handleMarkRead(notificationId: string) {
    setUpdatingId(notificationId);
    setErrorMessage('');
    try {
      await markNotificationRead(notificationId);
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId
          ? { ...notification, isRead: true, readAt: new Date().toISOString() }
          : notification
      )));
    } catch {
      setErrorMessage('既読更新に失敗しました。');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkAllRead() {
    setUpdatingAll(true);
    setErrorMessage('');
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true, readAt })));
    } catch {
      setErrorMessage('既読更新に失敗しました。');
    } finally {
      setUpdatingAll(false);
    }
  }

  async function handleOpenNotification(notification: AppNotification) {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) => current.map((currentNotification) => (
          currentNotification.id === notification.id
            ? { ...currentNotification, isRead: true, readAt: new Date().toISOString() }
            : currentNotification
        )));
      } catch {
        setErrorMessage('既読更新に失敗しました。');
        return;
      }
    }

    if (notification.linkPath) navigate(notification.linkPath);
  }

  return (
    <PageShell description="あなたへの反応や、進行中のつながりを確認できます。" eyebrow="Notifications" title="通知">
      <Card className="flower-gradient border-0 p-1 shadow-sm">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="bg-theme-main text-white"><Bell size={13} />通知センター Phase 1.5</Badge>
              <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-theme-text">つながりの反応を、やさしくキャッチ。</h2>
              <p className="mt-2 text-[13px] leading-6 text-theme-muted">参加希望・承認・DMの通知をアプリ内で確認できます。リアルタイム通知やプッシュ通知は今後の拡張予定です。</p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-2 text-center shadow-sm">
              <p className="text-2xl font-black text-theme-main-dark">{unreadCount}</p>
              <p className="text-[11px] font-black text-theme-muted">未読</p>
            </div>
          </div>
        </div>
      </Card>

      {!canUseSupabaseNotifications ? (
        <Card className="space-y-3 border-theme-main/10 bg-theme-card/84 text-center shadow-sm">
          <Inbox className="mx-auto text-theme-main" size={28} />
          <div>
            <p className="text-sm font-black text-theme-text">ログインすると通知を確認できます</p>
            <p className="mt-1 text-xs leading-5 text-theme-muted">localStorageデモ中、またはSupabase未接続時は通知一覧を空状態で表示します。</p>
          </div>
          <Button className="mx-auto" onClick={() => navigate('/login')} variant="secondary">ログインへ</Button>
        </Card>
      ) : null}

      {errorMessage ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{errorMessage}</div> : null}

      <div className="rounded-[1rem] bg-theme-card/62 px-3 py-2 text-[11px] font-bold text-theme-muted shadow-sm">
        Debug: 通知取得 {canUseSupabaseNotifications ? (loading ? '確認中' : `${notifications.length}件`) : '未ログイン/デモ'}・未読 {unreadCount}件
      </div>

      <div className="flex items-center justify-between rounded-full bg-theme-card/76 px-3.5 py-2.5 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5 text-[13px] font-black text-theme-main-dark"><MailCheck size={16} />未読 {unreadCount}件</span>
        <Button className="min-h-8 px-3 text-xs" disabled={!canUseSupabaseNotifications || unreadCount === 0 || updatingAll} onClick={() => void handleMarkAllRead()} variant="secondary">
          {updatingAll ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
          すべて既読にする
        </Button>
      </div>

      {loading ? (
        <Card className="flex items-center gap-2.5 bg-theme-card/84 text-sm font-bold text-theme-muted shadow-sm">
          <Loader2 className="animate-spin text-theme-main" size={18} />通知を読み込んでいます。
        </Card>
      ) : null}

      {!loading && notifications.length === 0 ? (
        <Card className="space-y-3 border-dashed border-theme-main/20 bg-theme-card/76 text-center shadow-sm">
          <Sparkles className="mx-auto text-theme-main" size={30} />
          <div>
            <p className="text-sm font-black text-theme-text">まだ通知はありません。参加希望やメッセージが届くと、ここに表示されます。</p>
            <p className="mt-1 text-xs leading-5 text-theme-muted">新しい反応が届いたら、未読として分かりやすく表示します。</p>
          </div>
        </Card>
      ) : null}

      <div className="space-y-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {notifications.map((notification) => (
          <Card
            className={`space-y-3 border-theme-main/10 py-3 shadow-sm transition ${notification.isRead ? 'bg-theme-card/78' : 'bg-cyan-50/85 ring-2 ring-theme-main/15'}`}
            key={notification.id}
          >
            <button className="w-full text-left" onClick={() => void handleOpenNotification(notification)} type="button">
              <div className="flex gap-3">
                <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl ${notification.isRead ? 'bg-theme-accent-soft text-theme-main-dark' : 'bg-theme-main text-white'}`}>
                  {getTypeIcon(notification.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge className={notification.isRead ? 'bg-theme-background/80 text-theme-muted' : 'bg-theme-main text-white'}>{getTypeLabel(notification.type)}</Badge>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-yellow-100 text-yellow-700'}`}>{notification.isRead ? '既読' : '未読'}</span>
                    <span className="text-[11px] font-bold text-theme-muted">{formatNotificationDate(notification.createdAt)}</span>
                  </span>
                  <span className="mt-2 block text-sm font-black text-theme-text">{notification.title}</span>
                  <span className="mt-1 block whitespace-pre-wrap break-words text-[13px] leading-6 text-theme-muted">{notification.body}</span>
                  {notification.linkPath ? <span className="mt-2 flex items-center gap-1 text-xs font-black text-theme-main-dark">関連ページへ移動 <ChevronRight size={14} /></span> : null}
                </span>
              </div>
            </button>
            {!notification.isRead ? (
              <div className="flex justify-end">
                <Button className="min-h-8 px-3 text-xs" disabled={updatingId === notification.id} onClick={() => void handleMarkRead(notification.id)} variant="secondary">
                  {updatingId === notification.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  既読にする
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
