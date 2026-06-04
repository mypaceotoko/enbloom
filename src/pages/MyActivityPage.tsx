import type { ReactNode } from 'react';
import { Bell, ClipboardList, DoorOpen, HeartHandshake, Loader2, MessageSquareText, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { useAuth } from '../hooks/useAuth';
import { getMyActivityPosts, getMyInterestedPosts } from '../lib/activityBoardApi';
import { getMyMatches } from '../lib/matchApi';
import { getNotificationErrorMessage, getNotificationSummary } from '../lib/notificationApi';
import type { ActivityInterestStatus, ActivityPostStatus } from '../types/activityBoard';
import type { AppNotification, NotificationType } from '../types/notification';

type ActivitySummary = {
  unreadCount: number;
  latestNotifications: AppNotification[];
  myPostCounts: Record<ActivityPostStatus, number>;
  interestCounts: Record<ActivityInterestStatus, number>;
  matchCount: number | null;
};

const initialSummary: ActivitySummary = {
  unreadCount: 0,
  latestNotifications: [],
  myPostCounts: { open: 0, closed: 0, archived: 0 },
  interestCounts: { interested: 0, accepted: 0, declined: 0, cancelled: 0 },
  matchCount: null,
};

function getTypeLabel(type: NotificationType) {
  if (type === 'activity_interest_received') return '参加希望';
  if (type === 'activity_interest_accepted') return '承認';
  return 'メッセージ';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));
}

export function MyActivityPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [summary, setSummary] = useState<ActivitySummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const canUseSupabaseActivity = isSupabaseMode && isAuthenticated && Boolean(user);

  const totalMyPosts = useMemo(
    () => summary.myPostCounts.open + summary.myPostCounts.closed + summary.myPostCounts.archived,
    [summary.myPostCounts],
  );

  useEffect(() => {
    let mounted = true;

    async function loadActivity() {
      setErrorMessage('');

      if (!canUseSupabaseActivity || !user) {
        setSummary(initialSummary);
        return;
      }

      setLoading(true);
      try {
        const [notificationSummary, myPosts, interestedPosts, matches] = await Promise.all([
          getNotificationSummary(3).catch((caughtError) => {
            setErrorMessage(getNotificationErrorMessage(caughtError));
            return { unreadCount: 0, latestNotifications: [] };
          }),
          getMyActivityPosts(user.id),
          getMyInterestedPosts(user.id),
          getMyMatches(user.id).catch(() => []),
        ]);

        if (!mounted) return;
        const myPostCounts = { open: 0, closed: 0, archived: 0 } satisfies Record<ActivityPostStatus, number>;
        myPosts.forEach((post) => {
          myPostCounts[post.status] += 1;
        });

        const interestCounts = { interested: 0, accepted: 0, declined: 0, cancelled: 0 } satisfies Record<ActivityInterestStatus, number>;
        interestedPosts.forEach((interest) => {
          interestCounts[interest.status] += 1;
        });

        setSummary({
          unreadCount: notificationSummary.unreadCount,
          latestNotifications: notificationSummary.latestNotifications,
          myPostCounts,
          interestCounts,
          matchCount: matches.length,
        });
      } catch (caughtError) {
        if (!mounted) return;
        console.warn('[ConnectBloom] my activity fetch failed', { success: false, error: caughtError });
        setSummary(initialSummary);
        setErrorMessage(caughtError instanceof Error && /ログイン/.test(caughtError.message) ? 'ログイン状態を確認できませんでした。' : 'マイアクティビティの取得に失敗しました。');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadActivity();
    return () => {
      mounted = false;
    };
  }, [canUseSupabaseActivity, user]);

  return (
    <PageShell description="あなたの募集・参加希望・通知をまとめて確認できます。" eyebrow="My Activity" title="マイアクティビティ">
      <Card className="flower-gradient border-0 p-1 shadow-sm">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-main text-white"><Sparkles size={20} /></span>
            <div>
              <Badge className="bg-theme-main text-white">通知センター</Badge>
              <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-theme-text">最近の動き</h2>
              <p className="mt-1 text-[13px] leading-6 text-theme-muted">通知・募集・参加希望・会話導線を、スマホで迷わず確認できる場所です。</p>
            </div>
          </div>
        </div>
      </Card>

      {!canUseSupabaseActivity ? (
        <Card className="space-y-3 border-theme-main/10 bg-theme-card/84 shadow-sm">
          <p className="text-sm font-black text-theme-text">ログインするとマイアクティビティを確認できます</p>
          <p className="text-xs leading-5 text-theme-muted">ログイン前は、デモ表示として件数0で表示します。</p>
          <Button className="w-full" onClick={() => navigate('/login')} variant="secondary">ログインへ</Button>
        </Card>
      ) : null}

      {errorMessage ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{errorMessage}</div> : null}
      {loading ? <Card className="flex items-center gap-2 text-sm font-bold text-theme-muted"><Loader2 className="animate-spin text-theme-main" size={18} />マイアクティビティを読み込んでいます。</Card> : null}

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-black text-theme-main-dark">通知</h2>
        <Card className="space-y-3 border-theme-main/15 bg-cyan-50/70 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-black text-theme-text"><Bell size={18} />未読通知</span>
            <span className="rounded-full bg-theme-main px-3 py-1 text-xs font-black text-white">{summary.unreadCount}件</span>
          </div>
          {summary.latestNotifications.length === 0 ? (
            <p className="rounded-2xl bg-theme-card/72 p-3 text-xs leading-5 text-theme-muted">まだ通知はありません。参加希望やメッセージが届くと、ここに表示されます。</p>
          ) : (
            <div className="space-y-2">
              {summary.latestNotifications.map((notification) => (
                <button className="w-full rounded-2xl bg-theme-card/80 p-3 text-left transition active:scale-[0.99]" key={notification.id} onClick={() => navigate(notification.linkPath ?? '/notifications')} type="button">
                  <span className="flex items-center gap-2 text-[11px] font-black text-theme-main-dark"><Badge>{getTypeLabel(notification.type)}</Badge>{formatDate(notification.createdAt)}</span>
                  <span className="mt-1 block text-sm font-black text-theme-text">{notification.title}</span>
                </button>
              ))}
            </div>
          )}
          <Link to="/notifications"><Button className="w-full" variant="secondary">通知をすべて見る</Button></Link>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard body={`募集中 ${summary.myPostCounts.open}件 / 締切済み ${summary.myPostCounts.closed}件`} buttonLabel="自分の募集を見る" icon={<ClipboardList size={18} />} path="/my-board" title="自分の募集" value={`${totalMyPosts}件`} />
        <SummaryCard body={`参加希望中 ${summary.interestCounts.interested}件 / 承認済み ${summary.interestCounts.accepted}件 / 見送り ${summary.interestCounts.declined}件 / 取り消し済み ${summary.interestCounts.cancelled}件`} buttonLabel="参加希望した募集を見る" icon={<HeartHandshake size={18} />} path="/my-interests" title="参加希望した募集" value={`${summary.interestCounts.interested + summary.interestCounts.accepted + summary.interestCounts.declined + summary.interestCounts.cancelled}件`} />
        <SummaryCard body={summary.matchCount === null ? 'コネクト一覧から会話へ進めます。' : `コネクト ${summary.matchCount}件`} buttonLabel="会話・コネクトを見る" icon={<MessageSquareText size={18} />} path="/matches" title="会話・コネクト" value={summary.matchCount === null ? '導線' : `${summary.matchCount}件`} />
        <SummaryCard body="活動仲間とテーマ別につながるルームを確認できます。" buttonLabel="ルームを見る" icon={<DoorOpen size={18} />} path="/rooms" title="ルーム" value="開く" />
      </section>
    </PageShell>
  );
}

function SummaryCard({ body, buttonLabel, icon, path, title, value }: { body: string; buttonLabel: string; icon: ReactNode; path: string; title: string; value: string }) {
  return (
    <Card className="space-y-3 bg-theme-card/86 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-theme-text">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-theme-muted">{body}</span>
        </span>
        <span className="rounded-full bg-theme-yellow/70 px-2.5 py-1 text-xs font-black text-theme-main-dark">{value}</span>
      </div>
      <Link to={path}><Button className="w-full" variant="secondary">{buttonLabel}</Button></Link>
    </Card>
  );
}
