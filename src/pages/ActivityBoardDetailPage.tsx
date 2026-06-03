import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, MessageSquareText, Monitor, UsersRound, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockActivityPosts } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import {
  acceptActivityPostInterest,
  cancelActivityPostInterest,
  declineActivityPostInterest,
  expressInterest,
  getActivityPostById,
  getActivityPostInterestsForOwner,
  getMyInterestedPostIds,
} from '../lib/activityBoardApi';
import type { ActivityInterestStatus, ActivityPostInterestWithProfile, ActivityPostMode, ActivityPostWithAuthor } from '../types/activityBoard';

function formatDate(value: string | null) {
  if (!value) return '未定';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(new Date(value));
}

function getModeLabel(mode: ActivityPostMode) {
  if (mode === 'online') return 'オンライン';
  if (mode === 'offline') return 'オフライン';
  return 'どちらでも';
}

function getStatusLabel(status: string) {
  if (status === 'closed') return '締切';
  if (status === 'archived') return 'アーカイブ';
  return '募集中';
}

function getInterestStatusLabel(status: ActivityInterestStatus) {
  if (status === 'accepted') return '承認済み';
  if (status === 'declined') return '見送り';
  if (status === 'cancelled') return '取り消し済み';
  return '参加希望中';
}

function getInterestStatusClass(status: ActivityInterestStatus) {
  if (status === 'accepted') return 'bg-emerald-50 text-emerald-700';
  if (status === 'declined') return 'bg-slate-100 text-slate-600';
  if (status === 'cancelled') return 'bg-orange-50 text-orange-700';
  return 'bg-theme-main text-white';
}

export function ActivityBoardDetailPage() {
  const { postId = '' } = useParams();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [post, setPost] = useState<ActivityPostWithAuthor | null>(null);
  const [interests, setInterests] = useState<ActivityPostInterestWithProfile[]>([]);
  const [interested, setInterested] = useState(false);
  const [notice, setNotice] = useState('');
  const [interestError, setInterestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingInterestId, setUpdatingInterestId] = useState<string | null>(null);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;
  const isOwnPost = Boolean(user?.id && post?.created_by === user.id);

  useEffect(() => {
    let mounted = true;

    async function loadPost() {
      if (!postId) return;
      setInterests([]);
      setInterestError('');

      if (!useSupabaseBoard) {
        setPost(mockActivityPosts.find((item) => item.id === postId) ?? null);
        setNotice('Supabaseログイン時に参加希望者を管理できます。');
        return;
      }

      if (!user?.id) {
        setPost(null);
        setNotice('ログイン状態を確認できませんでした。');
        return;
      }

      setLoading(true);
      setNotice('');
      try {
        const [nextPost, interestedIds] = await Promise.all([
          getActivityPostById(postId),
          getMyInterestedPostIds(user.id),
        ]);
        if (!mounted) return;
        setPost(nextPost);
        setInterested(interestedIds.includes(postId));

        if (nextPost?.created_by === user.id) {
          setInterestsLoading(true);
          try {
            const nextInterests = await getActivityPostInterestsForOwner(postId);
            if (!mounted) return;
            setInterests(nextInterests);
          } catch (caughtError) {
            if (!mounted) return;
            console.warn('[ConnectBloom] activity interest owner list failed', { success: false });
            setInterestError(caughtError instanceof Error ? `参加希望者一覧の取得に失敗しました: ${caughtError.message}` : '参加希望者一覧の取得に失敗しました');
          } finally {
            if (mounted) setInterestsLoading(false);
          }
        }
      } catch (caughtError) {
        if (!mounted) return;
        setPost(null);
        setNotice(caughtError instanceof Error ? `募集の取得に失敗しました: ${caughtError.message}` : '募集の取得に失敗しました。');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPost();
    return () => {
      mounted = false;
    };
  }, [postId, useSupabaseBoard, user?.id]);

  async function handleInterest() {
    if (!post) return;
    if (!useSupabaseBoard) {
      setNotice('ログインすると参加したいを送れます。');
      return;
    }
    if (isOwnPost) {
      setNotice('自分の募集には参加したいを送れません。');
      return;
    }

    setSaving(true);
    setNotice('');
    try {
      if (interested) {
        await cancelActivityPostInterest(post.id);
        setInterested(false);
        setPost({ ...post, interest_count: Math.max(0, post.interest_count - 1) });
        setNotice('参加希望を取り消しました。');
      } else {
        await expressInterest(post.id);
        setInterested(true);
        setPost({ ...post, interest_count: post.interest_count + 1 });
        setNotice('参加したいを送りました。');
      }
    } catch (caughtError) {
      const fallback = interested ? '参加希望の取り消しに失敗しました' : '参加したいの保存に失敗しました';
      setNotice(caughtError instanceof Error ? `${fallback}: ${caughtError.message}` : fallback);
    } finally {
      setSaving(false);
    }
  }

  async function handleOwnerStatusChange(interestId: string, status: 'accepted' | 'declined') {
    setUpdatingInterestId(interestId);
    setInterestError('');
    try {
      const updatedInterest = status === 'accepted'
        ? await acceptActivityPostInterest(interestId)
        : await declineActivityPostInterest(interestId);
      setInterests((current) => current.map((interest) => (
        interest.id === interestId ? { ...interest, status: updatedInterest.status, updated_at: updatedInterest.updated_at } : interest
      )));
    } catch (caughtError) {
      const fallback = status === 'accepted' ? '承認に失敗しました' : '見送りに失敗しました';
      setInterestError(caughtError instanceof Error ? `${fallback}: ${caughtError.message}` : fallback);
    } finally {
      setUpdatingInterestId(null);
    }
  }

  return (
    <PageShell description="活動・興味・共創を軸にした募集の詳細です。" eyebrow="Activity Detail" title="募集詳細">
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/board"><ArrowLeft size={16} />募集ボードへ戻る</Link>
      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {loading ? <Card className="text-sm font-bold text-theme-muted">募集を読み込んでいます...</Card> : null}
      {!loading && !post ? (
        <Card className="space-y-2 text-center">
          <p className="text-base font-black text-theme-text">募集が見つかりません</p>
          <p className="text-sm leading-6 text-theme-muted">公開範囲やステータスが変わった可能性があります。</p>
        </Card>
      ) : null}
      {post ? (
        <>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-2">
                <Badge>{post.category}</Badge>
                <h1 className="text-2xl font-black leading-tight text-theme-text">{post.title}</h1>
              </div>
              <Badge className="bg-theme-main text-white">{getStatusLabel(post.status)}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-theme-text">{post.body}</p>
            <div className="grid gap-2 text-sm font-bold text-theme-muted sm:grid-cols-2">
              <span className="inline-flex items-center gap-1"><MapPin size={16} />活動エリア: {post.area || '未設定'}</span>
              <span className="inline-flex items-center gap-1"><Monitor size={16} />形式: {getModeLabel(post.mode)}</span>
              <span className="inline-flex items-center gap-1"><UsersRound size={16} />募集人数: {post.max_participants ? `${post.max_participants}人` : '任意'}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={16} />開催予定日: {formatDate(post.scheduled_at)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{post.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            <div className="rounded-xl bg-theme-accent-soft/60 p-3 text-sm font-black text-theme-main-dark">参加希望 {post.interest_count}件</div>
            {!isOwnPost ? (
              <Button className="w-full" disabled={saving || !useSupabaseBoard || post.status !== 'open'} onClick={handleInterest}>
                <UsersRound size={16} />{interested ? '参加希望を取り消す' : '参加したい'}
              </Button>
            ) : null}
            {!useSupabaseBoard ? <p className="text-xs font-bold text-theme-muted">Supabaseログイン時に参加希望者を管理できます。</p> : null}
            {isOwnPost ? <p className="text-xs font-bold text-theme-muted">今回は会話連携前の管理フェーズです。</p> : null}
          </Card>

          {isOwnPost ? (
            <Card className="space-y-4">
              <div className="space-y-2">
                <h2 className="flex items-center gap-1.5 text-lg font-black text-theme-text"><UsersRound size={18} />参加希望者</h2>
                <p className="text-sm leading-6 text-theme-muted">この募集に興味を持っている人を確認し、承認または見送りできます。</p>
                <p className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold leading-6 text-theme-muted">承認すると、次のフェーズで会話につなげられる予定です。今回は会話連携前の管理フェーズです。</p>
              </div>
              {interestError ? <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{interestError}</div> : null}
              {interestsLoading ? <p className="text-sm font-bold text-theme-muted">参加希望者を読み込んでいます...</p> : null}
              {!interestsLoading && interests.length === 0 ? <p className="text-sm font-bold text-theme-muted">まだ参加希望者はいません。</p> : null}
              <div className="space-y-3">
                {interests.map((interest) => (
                  <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm" key={interest.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`size-12 shrink-0 rounded-2xl bg-gradient-to-br ${interest.profile?.gradient ?? 'from-emerald-100 to-pink-100'}`} />
                        <div className="space-y-1">
                          <p className="font-black text-theme-text">{interest.profile?.name ?? 'ConnectBloomユーザー'}</p>
                          <p className="text-xs font-bold text-theme-muted">{interest.profile?.age ?? 18}歳 / {interest.profile?.location ?? '活動エリア未設定'}</p>
                          <p className="text-xs font-bold text-theme-muted">つながり方のスタンス: {interest.profile?.datingTemperature ?? 'プロフィール準備中'}</p>
                        </div>
                      </div>
                      <Badge className={getInterestStatusClass(interest.status)}>{getInterestStatusLabel(interest.status)}</Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-theme-muted">
                      <p><span className="font-black text-theme-text">活動ジャンル / 興味タグ:</span> {interest.profile?.interests?.length ? interest.profile.interests.join(' / ') : '未設定'}</p>
                      <p><span className="font-black text-theme-text">参加希望メッセージ:</span> {interest.message || 'メッセージはまだありません。'}</p>
                      <p><span className="font-black text-theme-text">参加希望日時:</span> {formatDate(interest.created_at)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/70 pt-3">
                      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to={`/profile/${interest.user_id}`}><MessageSquareText size={15} />プロフィール詳細</Link>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={updatingInterestId === interest.id || interest.status !== 'interested'} onClick={() => void handleOwnerStatusChange(interest.id, 'accepted')} variant="secondary"><CheckCircle2 size={16} />承認する</Button>
                        <Button disabled={updatingInterestId === interest.id || interest.status !== 'interested'} onClick={() => void handleOwnerStatusChange(interest.id, 'declined')} variant="danger"><XCircle size={16} />見送る</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="space-y-3">
            <h2 className="text-base font-black text-theme-text">投稿者プロフィール概要</h2>
            <div className="flex items-start gap-3">
              <div className={`size-12 shrink-0 rounded-2xl bg-gradient-to-br ${post.author?.gradient ?? 'from-emerald-100 to-pink-100'}`} />
              <div className="space-y-1">
                <p className="font-black text-theme-text">{post.author?.name ?? 'ConnectBloomユーザー'}</p>
                <p className="text-xs font-bold text-theme-muted">{post.author?.location ?? '活動エリア未設定'} / {post.author?.occupation ?? 'プロフィール準備中'}</p>
                <p className="text-sm leading-6 text-theme-muted">{post.author?.bio ?? '紹介から広がるつながりを大切にしています。'}</p>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
