import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, MessageSquareText, Monitor, Pencil, UsersRound, XCircle } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockActivityPosts } from '../data/mockActivityPosts';
import { demoChatRooms } from '../data/mockChatRooms';
import { useAuth } from '../hooks/useAuth';
import {
  acceptActivityPostInterest,
  cancelActivityPostInterest,
  declineActivityPostInterest,
  expressInterest,
  getActivityPostById,
  getActivityPostInterestsForOwner,
  getMyActivityPostInterest,
} from '../lib/activityBoardApi';
import { formatConversationFailureMessage, getActivityInterestConversationPath } from '../lib/matchApi';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import { notifyActivityInterestAccepted, notifyActivityInterestReceived } from '../lib/notificationApi';
import { getChatRoomById } from '../lib/chatRoomApi';
import type { ActivityInterestStatus, ActivityPostInterestWithProfile, ActivityPostMode, ActivityPostWithAuthor } from '../types/activityBoard';

function formatDate(value: string | null) {
  if (!value) return '未定';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(new Date(value));
}

function getModeLabel(mode: ActivityPostMode) {
  if (mode === 'online') return 'オンライン';
  if (mode === 'offline') return 'オフライン';
  return 'ハイブリッド';
}

function getStatusLabel(status: string) {
  if (status === 'closed') return '締切済み';
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
  if (status === 'accepted') return 'bg-cyan-50 text-cyan-700';
  if (status === 'declined') return 'bg-slate-100 text-slate-600';
  if (status === 'cancelled') return 'bg-orange-50 text-orange-700';
  return 'bg-theme-main text-white';
}

function getParticipantStatusMessage(status: ActivityInterestStatus | null) {
  if (status === 'interested') return '参加希望を送信済みです';
  if (status === 'accepted') return '承認済みです。会話で進め方を相談できます';
  if (status === 'declined') return '今回は見送りになりました';
  if (status === 'cancelled') return '参加希望を取り消しました';
  return 'この募集に参加したい';
}

function getNotificationDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string } | null | undefined) {
  const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return user?.email?.split('@')[0] || 'ユーザー';
}

export function ActivityBoardDetailPage() {
  const { postId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [post, setPost] = useState<ActivityPostWithAuthor | null>(null);
  const [sourceRoomName, setSourceRoomName] = useState('');
  const [interests, setInterests] = useState<ActivityPostInterestWithProfile[]>([]);
  const [myInterest, setMyInterest] = useState<ActivityPostInterestWithProfile | null>(null);
  const [notice, setNotice] = useState('');
  const [interestError, setInterestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingInterestId, setUpdatingInterestId] = useState<string | null>(null);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;
  const isOwnPost = Boolean(user?.id && post?.created_by === user.id);

  useEffect(() => {
    let mounted = true;

    async function loadPost() {
      if (!postId) return;
      setInterests([]);
      setMyInterest(null);
      setSourceRoomName('');
      setInterestError('');
      setNotice(typeof location.state?.message === 'string' ? location.state.message : '');

      if (!useSupabaseBoard) {
        const demoPost = mockActivityPosts.find((item) => item.id === postId) ?? null;
        setPost(demoPost);
        const demoRoom = demoPost?.room_id ? demoChatRooms.find((room) => room.slug === demoPost.room_id || room.id === demoPost.room_id) : null;
        setSourceRoomName(demoRoom?.name ?? '');
        if (!location.state?.message) setNotice('ログインすると会話を始められます。');
        return;
      }

      if (!user?.id) {
        setPost(null);
        setNotice('ログイン状態を確認できませんでした。');
        return;
      }

      setLoading(true);
      if (!location.state?.message) setNotice('');
      try {
        const [nextPost, nextMyInterest] = await Promise.all([
          getActivityPostById(postId),
          getMyActivityPostInterest(postId, user.id),
        ]);
        if (!mounted) return;
        setPost(nextPost);
        setMyInterest(nextMyInterest ? { ...nextMyInterest, profile: null } : null);

        if (nextPost?.room_id) {
          const demoRoom = demoChatRooms.find((room) => room.slug === nextPost.room_id || room.id === nextPost.room_id);
          if (demoRoom) {
            setSourceRoomName(demoRoom.name);
          } else {
            try {
              const sourceRoom = await getChatRoomById(nextPost.room_id);
              if (mounted) setSourceRoomName(sourceRoom?.name ?? '');
            } catch {
              if (mounted) setSourceRoomName('ルーム');
            }
          }
        }

        if (nextPost?.created_by === user.id) {
          setInterestsLoading(true);
          try {
            const nextInterests = await getActivityPostInterestsForOwner(postId);
            if (!mounted) return;
            setInterests(nextInterests);
          } catch (caughtError) {
            if (!mounted) return;
            console.warn('[ConnectBloom] activity interest owner list failed', getSafeErrorLog(caughtError, 'activity_interest_owner_list_failed'));
            setInterestError(getShortErrorMessage(caughtError, '参加希望者一覧の取得に失敗しました。時間を置いてもう一度お試しください。'));
          } finally {
            if (mounted) setInterestsLoading(false);
          }
        }
      } catch (caughtError) {
        if (!mounted) return;
        setPost(null);
        setNotice(getShortErrorMessage(caughtError, '募集情報の取得に失敗しました。時間を置いてもう一度お試しください。'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPost();
    return () => {
      mounted = false;
    };
  }, [location.state, postId, useSupabaseBoard, user?.id]);

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
      if (myInterest?.status === 'interested' || myInterest?.status === 'accepted') {
        const updatedInterest = await cancelActivityPostInterest(post.id);
        setMyInterest({ ...updatedInterest, profile: null });
        setPost({ ...post, interest_count: Math.max(0, post.interest_count - 1), accepted_count: myInterest.status === 'accepted' ? Math.max(0, post.accepted_count - 1) : post.accepted_count });
        setNotice('参加希望を取り消しました。');
      } else {
        const nextInterest = await expressInterest(post.id);
        void notifyActivityInterestReceived(post.id, post.title, post.created_by, getNotificationDisplayName(user)).catch((caughtError) => {
          console.warn('[ConnectBloom] notification creation failed', { type: 'activity_interest_received', ...getSafeErrorLog(caughtError, 'notification_creation_failed') });
        });
        setMyInterest({ ...nextInterest, profile: null });
        setPost({ ...post, interest_count: post.interest_count + 1 });
        setNotice('参加希望を送りました。');
      }
    } catch (caughtError) {
      const fallback = myInterest?.status === 'interested' || myInterest?.status === 'accepted' ? '参加希望の取り消しに失敗しました' : '参加希望の保存に失敗しました';
      setNotice(getShortErrorMessage(caughtError, `${fallback}。時間を置いてもう一度お試しください。`));
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
      if (status === 'accepted' && post) {
        void notifyActivityInterestAccepted(post.id, post.title, updatedInterest.user_id).catch((caughtError) => {
          console.warn('[ConnectBloom] notification creation failed', { type: 'activity_interest_accepted', ...getSafeErrorLog(caughtError, 'notification_creation_failed') });
        });
      }
      setInterests((current) => current.map((interest) => (
        interest.id === interestId ? { ...interest, status: updatedInterest.status, updated_at: updatedInterest.updated_at } : interest
      )));
    } catch (caughtError) {
      const fallback = status === 'accepted' ? '承認に失敗しました' : '見送りに失敗しました';
      setInterestError(getShortErrorMessage(caughtError, `${fallback}。時間を置いてもう一度お試しください。`));
    } finally {
      setUpdatingInterestId(null);
    }
  }

  async function handleOpenConversation(interest: ActivityPostInterestWithProfile) {
    if (!post) return;
    if (!useSupabaseBoard) {
      setInterestError('ログインすると会話を始められます。');
      return;
    }
    if (!user?.id) {
      setInterestError('ログイン状態を確認できませんでした。');
      return;
    }
    if (interest.status !== 'accepted') {
      setInterestError('参加希望が承認済みではありません。');
      return;
    }

    setOpeningConversationId(interest.id);
    setInterestError('');
    try {
      const result = await getActivityInterestConversationPath({ postId: post.id, interestId: interest.id, targetUserId: interest.user_id });
      if (!result.success || !result.path) {
        const phase = result.phase ?? (!result.success ? 'rpc_failed' : 'match_id_missing');
        const message = result.message ?? (result.blocked ? 'ブロック中のため会話を開始できません。' : 'matchIdを取得できませんでした。');
        setInterestError(message.startsWith('会話の作成に失敗しました。') ? message : formatConversationFailureMessage(phase, message, result.debugError));
        return;
      }
      navigate(result.path);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'unknown';
      console.error('[ConnectBloom] messages navigation failed', getSafeErrorLog(caughtError, 'navigation_failed'));
      setInterestError(formatConversationFailureMessage('navigation_failed', message));
    } finally {
      setOpeningConversationId(null);
    }
  }

  async function handleOpenMyConversation() {
    if (!post || !myInterest) return;
    if (myInterest.status !== 'accepted') return;
    setSaving(true);
    setNotice('');
    try {
      const result = await getActivityInterestConversationPath({ postId: post.id, interestId: myInterest.id, targetUserId: post.created_by });
      if (!result.success || !result.path) {
        const phase = result.phase ?? (!result.success ? 'rpc_failed' : 'match_id_missing');
        const message = result.message ?? (result.blocked ? 'ブロック中のため会話を開始できません。' : 'matchIdを取得できませんでした。');
        setNotice(message.startsWith('会話の作成に失敗しました。') ? message : formatConversationFailureMessage(phase, message, result.debugError));
        return;
      }
      navigate(result.path);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'unknown';
      console.error('[ConnectBloom] messages navigation failed', getSafeErrorLog(caughtError, 'navigation_failed'));
      setNotice(formatConversationFailureMessage('navigation_failed', message));
    } finally {
      setSaving(false);
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
              <div className="flex flex-wrap gap-2"><Badge className="bg-theme-main text-white">{getStatusLabel(post.status)}</Badge>{isOwnPost ? <Badge className="bg-theme-card text-theme-main-dark">自分が投稿者</Badge> : null}{!isOwnPost && myInterest ? <Badge className={getInterestStatusClass(myInterest.status)}>{getInterestStatusLabel(myInterest.status)}</Badge> : null}</div>
            </div>
            {sourceRoomName ? <div className="rounded-xl bg-theme-accent-soft/70 p-3 text-sm font-black text-theme-main-dark">{sourceRoomName}ルームから生まれた募集</div> : null}
            <p className="whitespace-pre-wrap text-sm leading-7 text-theme-text">{post.body}</p>
            <div className="grid gap-2 text-sm font-bold text-theme-muted sm:grid-cols-2">
              <span className="inline-flex items-center gap-1"><MapPin size={16} />活動エリア: {post.area || '未設定'}</span>
              <span className="inline-flex items-center gap-1"><Monitor size={16} />形式: {getModeLabel(post.mode)}</span>
              <span className="inline-flex items-center gap-1"><UsersRound size={16} />募集人数: {post.max_participants ? `${post.max_participants}人` : '任意'}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={16} />開催予定日: {formatDate(post.scheduled_at)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{post.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            <div className="rounded-xl bg-theme-accent-soft/60 p-3 text-sm font-black text-theme-main-dark">参加希望 {post.interest_count}件 / 承認済み {post.accepted_count}件</div>
            {isOwnPost ? (
              <Link className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-theme-main px-4 py-2 text-[13px] font-bold text-white" to={`/board/${post.id}/edit`}><Pencil size={16} />募集を編集</Link>
            ) : null}
            {!isOwnPost ? (
              <div className="space-y-2 rounded-2xl border border-theme-sky/20 bg-theme-card/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={myInterest ? getInterestStatusClass(myInterest.status) : 'bg-theme-card text-theme-main-dark'}>{myInterest ? getInterestStatusLabel(myInterest.status) : '未参加'}</Badge>
                  <p className="text-sm font-black text-theme-text">{getParticipantStatusMessage(myInterest?.status ?? null)}</p>
                </div>
                {myInterest?.status === 'accepted' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button className="bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 text-theme-main-dark shadow-sm shadow-theme-sky/20" disabled={saving || !useSupabaseBoard} onClick={() => void handleOpenMyConversation()} variant="secondary">
                      <MessageSquareText size={16} />投稿者と会話する
                    </Button>
                    <Button disabled={saving || !useSupabaseBoard} onClick={handleInterest} variant="secondary">
                      <UsersRound size={16} />参加希望を取り消す
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" disabled={saving || !useSupabaseBoard || post.status !== 'open'} onClick={handleInterest}>
                    <UsersRound size={16} />{myInterest?.status === 'interested' ? '参加希望を取り消す' : 'この募集に参加したい'}
                  </Button>
                )}
              </div>
            ) : null}
            {!useSupabaseBoard ? <p className="text-xs font-bold text-theme-muted">Supabaseログイン時に参加希望者を管理できます。</p> : null}
            {isOwnPost ? <p className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold leading-6 text-theme-muted">承認済みになると、参加者と1対1の会話を始められます。</p> : null}
          </Card>

          {isOwnPost ? (
            <Card className="space-y-4">
              <div className="space-y-2">
                <h2 className="flex items-center gap-1.5 text-lg font-black text-theme-text"><UsersRound size={18} />参加希望者</h2>
                <p className="text-sm leading-6 text-theme-muted">この募集に興味を持っている人を確認し、承認または見送りできます。</p>
                <p className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold leading-6 text-theme-muted">承認済みになると、参加者と1対1の会話を始められます。まずは日程や進め方を相談してみましょう。</p>
              </div>
              {interestError ? <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{interestError}</div> : null}
              {interestsLoading ? <p className="text-sm font-bold text-theme-muted">参加希望者を読み込んでいます...</p> : null}
              {!interestsLoading && interests.length === 0 ? <p className="text-sm font-bold text-theme-muted">まだ参加希望者はいません。</p> : null}
              <div className="space-y-3">
                {interests.map((interest) => (
                  <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm" key={interest.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`size-12 shrink-0 rounded-2xl bg-gradient-to-br ${interest.profile?.gradient ?? 'from-cyan-100 to-sky-100'}`} />
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
                        {interest.status === 'interested' ? (
                          <>
                            <Button disabled={updatingInterestId === interest.id} onClick={() => void handleOwnerStatusChange(interest.id, 'accepted')} variant="secondary"><CheckCircle2 size={16} />承認する</Button>
                            <Button disabled={updatingInterestId === interest.id} onClick={() => void handleOwnerStatusChange(interest.id, 'declined')} variant="danger"><XCircle size={16} />見送る</Button>
                          </>
                        ) : null}
                        {interest.status === 'accepted' ? (
                          <>
                            <span className="inline-flex min-h-11 items-center rounded-xl bg-cyan-50 px-4 py-2 text-[13px] font-black text-cyan-700">承認済み</span>
                            <Button className="bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 text-theme-main-dark shadow-sm shadow-theme-sky/20" disabled={openingConversationId === interest.id} onClick={() => void handleOpenConversation(interest)} variant="secondary"><MessageSquareText size={16} />{openingConversationId === interest.id ? '会話を準備中…' : '会話へ'}</Button>
                          </>
                        ) : null}
                        {interest.status === 'declined' ? <span className="inline-flex min-h-11 items-center rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-black text-slate-600">見送り</span> : null}
                        {interest.status === 'cancelled' ? <span className="inline-flex min-h-11 items-center rounded-xl bg-orange-50 px-4 py-2 text-[13px] font-black text-orange-700">取り消し済み</span> : null}
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
              <div className={`size-12 shrink-0 rounded-2xl bg-gradient-to-br ${post.author?.gradient ?? 'from-cyan-100 to-sky-100'}`} />
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
