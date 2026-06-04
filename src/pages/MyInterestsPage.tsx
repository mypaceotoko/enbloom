import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, MessageSquareText, Undo2, UserRound, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { useAuth } from '../hooks/useAuth';
import { cancelActivityPostInterest, getMyInterestedPosts } from '../lib/activityBoardApi';
import { formatConversationFailureMessage, getActivityInterestConversationPath } from '../lib/matchApi';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import type { ActivityInterestStatus, MyInterestedActivityPost } from '../types/activityBoard';

function formatDate(value: string | null) {
  if (!value) return '未定';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(new Date(value));
}

function getInterestStatusLabel(status: ActivityInterestStatus) {
  if (status === 'accepted') return '承認済み';
  if (status === 'declined') return '見送り';
  if (status === 'cancelled') return '取り消し済み';
  return '参加希望中';
}

function getInterestStatusClass(status: ActivityInterestStatus) {
  if (status === 'accepted') return 'bg-cyan-50 text-cyan-700';
  if (status === 'declined') return 'bg-slate-100 text-slate-600';
  if (status === 'cancelled') return 'bg-orange-50 text-orange-700';
  return 'bg-theme-main text-white';
}

function getInterestStatusMessage(status: ActivityInterestStatus) {
  if (status === 'accepted') return '承認済み。投稿者と会話できます';
  if (status === 'declined') return '今回は見送りになりました';
  if (status === 'cancelled') return '参加希望を取り消しました';
  return '参加希望中です';
}

export function MyInterestsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [interests, setInterests] = useState<MyInterestedActivityPost[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancellingPostId, setCancellingPostId] = useState<string | null>(null);
  const [openingInterestId, setOpeningInterestId] = useState<string | null>(null);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;

  useEffect(() => {
    let mounted = true;

    async function loadInterests() {
      setError('');
      setNotice('');

      if (!useSupabaseBoard) {
        setInterests([]);
        setNotice('ログインすると参加希望した募集を確認できます。');
        return;
      }

      if (!user?.id) {
        setInterests([]);
        setError('ログイン状態を確認できませんでした');
        return;
      }

      setLoading(true);
      try {
        const nextInterests = await getMyInterestedPosts(user.id);
        if (!mounted) return;
        setInterests(nextInterests);
      } catch (caughtError) {
        if (!mounted) return;
        console.warn('[ConnectBloom] my interested posts fetch failed', { success: false });
        setInterests([]);
        setError(getShortErrorMessage(caughtError, '参加希望した募集の取得に失敗しました。時間を置いてもう一度お試しください。'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInterests();
    return () => {
      mounted = false;
    };
  }, [useSupabaseBoard, user?.id]);

  async function handleOpenConversation(interest: MyInterestedActivityPost) {
    if (!useSupabaseBoard) {
      setError('ログインすると会話を始められます。');
      return;
    }
    if (!user?.id) {
      setError('ログイン状態を確認できませんでした。');
      return;
    }
    if (interest.status !== 'accepted') {
      setError('参加希望が承認済みではありません。');
      return;
    }

    setOpeningInterestId(interest.id);
    setError('');
    try {
      const result = await getActivityInterestConversationPath({ postId: interest.post_id, interestId: interest.id, targetUserId: interest.post?.created_by });
      if (!result.success || !result.path) {
        const phase = result.phase ?? (!result.success ? 'rpc_failed' : 'match_id_missing');
        const message = result.message ?? (result.blocked ? 'ブロック中のため会話を開始できません。' : 'matchIdを取得できませんでした。');
        setError(message.startsWith('会話の作成に失敗しました。') ? message : formatConversationFailureMessage(phase, message, result.debugError));
        return;
      }
      navigate(result.path);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'unknown';
      console.error('[ConnectBloom] messages navigation failed', getSafeErrorLog(caughtError, 'navigation_failed'));
      setError(formatConversationFailureMessage('navigation_failed', message));
    } finally {
      setOpeningInterestId(null);
    }
  }

  async function handleCancel(interest: MyInterestedActivityPost) {
    if (!useSupabaseBoard) return;
    const confirmed = window.confirm('この参加希望を取り消しますか？');
    if (!confirmed) return;

    setCancellingPostId(interest.post_id);
    setError('');
    try {
      const updated = await cancelActivityPostInterest(interest.post_id);
      setInterests((current) => current.map((item) => (
        item.id === interest.id ? { ...item, status: updated.status, updated_at: updated.updated_at } : item
      )));
      setNotice('参加希望を取り消しました。');
    } catch (caughtError) {
      setError(getShortErrorMessage(caughtError, '参加希望の取り消しに失敗しました。時間を置いてもう一度お試しください。'));
    } finally {
      setCancellingPostId(null);
    }
  }

  return (
    <PageShell description="送った参加希望と、その後の状態を確認できます。" eyebrow="My Interests" title="参加希望した募集">
      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {error ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <Badge className="bg-theme-main text-white"><UsersRound size={13} />一緒にやりたいこと</Badge>
          <p className="mt-2 text-sm leading-6 text-theme-muted">送った参加希望と、その後の状態を確認できます。承認された募集は、投稿者と会話できます。</p>
        </div>
      </Card>

      {loading ? <Card className="text-sm font-bold text-theme-muted">参加希望した募集を読み込んでいます...</Card> : null}
      {!loading && interests.length === 0 ? (
        <Card className="space-y-2 text-center">
          <p className="text-base font-black text-theme-text">参加希望した募集はまだありません</p>
          <p className="text-sm leading-6 text-theme-muted">気になる募集があれば「参加したい」から小さく始めてみましょう。</p>
          <Link className="inline-flex text-sm font-black text-theme-main-dark" to="/board">募集ボードを見る</Link>
        </Card>
      ) : null}

      <div className="space-y-4">
        {interests.map((interest) => (
          <Card className="space-y-3" key={interest.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Badge>{interest.post?.category ?? 'カテゴリ未設定'}</Badge>
                <h2 className="mt-2 text-lg font-black leading-tight text-theme-text">{interest.post?.title ?? '募集タイトルを確認できません'}</h2>
              </div>
              <Badge className={getInterestStatusClass(interest.status)}>{getInterestStatusLabel(interest.status)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-theme-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><UserRound size={14} />投稿者 {interest.post?.author?.name ?? 'ConnectBloomユーザー'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><MapPin size={14} />{interest.post?.area || '活動エリア未設定'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><CalendarDays size={14} />参加希望 {formatDate(interest.created_at)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{interest.post?.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/60 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link className="text-sm font-black text-theme-main-dark" to={`/board/${interest.post_id}`}>詳細を見る</Link>
                <span className={`text-xs font-bold ${interest.status === 'accepted' ? 'text-cyan-700' : 'text-theme-muted'}`}>{getInterestStatusMessage(interest.status)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {interest.status === 'accepted' ? <Button className="bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 text-theme-main-dark shadow-sm shadow-theme-sky/20" disabled={!useSupabaseBoard || openingInterestId === interest.id} onClick={() => void handleOpenConversation(interest)} variant="secondary"><MessageSquareText size={16} />{openingInterestId === interest.id ? '会話を準備中…' : '投稿者と会話する'}</Button> : null}
                <Button disabled={!useSupabaseBoard || cancellingPostId === interest.post_id || interest.status === 'cancelled'} onClick={() => void handleCancel(interest)} variant="secondary"><Undo2 size={16} />参加希望を取り消す</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
