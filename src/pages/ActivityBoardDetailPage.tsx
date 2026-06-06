import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, MessageSquareText, Monitor, Pencil, ShieldAlert, Trash2, UsersRound, XCircle } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockActivityPosts } from '../data/mockActivityPosts';
import { demoChatRooms } from '../data/mockChatRooms';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../lib/i18n';
import {
  acceptActivityPostInterest,
  cancelActivityPostInterest,
  declineActivityPostInterest,
  expressInterest,
  getActivityPostById,
  getActivityPostInterestsForOwner,
  getMyActivityPostInterest,
  archiveActivityPostForAdmin,
  restoreActivityPostForAdmin,
  withdrawActivityPost,
} from '../lib/activityBoardApi';
import { formatConversationFailureMessage, getActivityInterestConversationPath } from '../lib/matchApi';
import { isDemoModeEnabled } from '../lib/demoSession';
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

function getStatusLabel(status: string, t: (key: TranslationKey) => string) {
  if (status === 'closed') return t('board.closed');
  if (status === 'archived') return t('board.archived');
  return t('board.open');
}

function getInterestStatusLabel(status: ActivityInterestStatus, t: (key: TranslationKey) => string) {
  if (status === 'accepted') return t('board.accepted');
  if (status === 'declined') return t('board.detail.passed');
  if (status === 'cancelled') return t('myInterests.canceled');
  return t('myInterests.pending');
}

function getInterestStatusClass(status: ActivityInterestStatus) {
  if (status === 'accepted') return 'bg-cyan-50 text-cyan-700';
  if (status === 'declined') return 'bg-slate-100 text-slate-600';
  if (status === 'cancelled') return 'bg-orange-50 text-orange-700';
  return 'bg-theme-main text-white';
}

function getParticipantStatusMessage(status: ActivityInterestStatus | null, t: (key: TranslationKey) => string) {
  if (status === 'interested') return t('board.detail.interestSent');
  if (status === 'accepted') return t('board.detail.accepted');
  if (status === 'declined') return t('board.detail.passed');
  if (status === 'cancelled') return t('myInterests.canceled');
  return t('board.detail.interestedButton');
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
  const { isFounder } = useAdmin();
  const { language, t } = useLanguage();
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
  const useSupabaseBoard = isSupabaseMode && isAuthenticated && !isDemoModeEnabled();
  const isOwnPost = Boolean(user?.id && post?.created_by === user.id);
  const canUseFounderPostModeration = Boolean(isFounder && useSupabaseBoard && post);

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


  async function handleFounderTogglePostVisibility() {
    if (!post || !canUseFounderPostModeration) return;

    setInterestError('');
    setNotice('');
    const willRestore = post.status === 'archived';
    const confirmed = window.confirm(willRestore
      ? 'この募集を一覧に戻しますか？'
      : 'この募集を非表示にしますか？募集は削除されず、管理者と投稿者が確認できます。');
    if (!confirmed) return;

    setSaving(true);
    try {
      const updatedPost = willRestore ? await restoreActivityPostForAdmin(post.id) : await archiveActivityPostForAdmin(post.id);
      setPost((current) => (current ? { ...current, ...updatedPost } : current));
      setNotice(willRestore ? '募集を戻しました。' : '募集を非表示にしました。');
    } catch (caughtError) {
      setInterestError(getShortErrorMessage(caughtError, willRestore ? '募集を戻せませんでした。' : '募集を非表示にできませんでした。'));
    } finally {
      setSaving(false);
    }
  }


  async function handleOwnerWithdrawPost() {
    if (!post || !isOwnPost || post.status === 'archived') return;

    setInterestError('');
    setNotice('');
    const confirmed = window.confirm('この募集を取り下げますか？');
    if (!confirmed) return;

    setSaving(true);
    try {
      await withdrawActivityPost(post.id);
      navigate('/board', { state: { message: '募集を取り下げました' } });
    } catch (caughtError) {
      setNotice(getShortErrorMessage(caughtError, '募集の取り下げに失敗しました'));
    } finally {
      setSaving(false);
    }
  }

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
    <PageShell description={t('board.description')} eyebrow="Activity Detail" title={t('board.detail.title')}>
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/board"><ArrowLeft size={16} />{t('board.back')}</Link>
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
              <div className="flex flex-wrap gap-2"><Badge className="bg-theme-main text-white">{getStatusLabel(post.status, t)}</Badge>{isOwnPost ? <Badge className="bg-theme-card text-theme-main-dark">自分が投稿者</Badge> : null}{isFounder ? <Badge className="bg-amber-50 text-amber-700">管理者操作</Badge> : null}{!isOwnPost && myInterest ? <Badge className={getInterestStatusClass(myInterest.status)}>{getInterestStatusLabel(myInterest.status, t)}</Badge> : null}</div>
            </div>
            {sourceRoomName ? <div className="rounded-xl bg-theme-accent-soft/70 p-3 text-sm font-black text-theme-main-dark">{sourceRoomName}: {t('board.createdFromRoom')}</div> : null}
            <p className="whitespace-pre-wrap text-sm leading-7 text-theme-text">{post.body}</p>
            <div className="grid gap-2 text-sm font-bold text-theme-muted sm:grid-cols-2">
              <span className="inline-flex items-center gap-1"><MapPin size={16} />活動エリア: {post.area || '未設定'}</span>
              <span className="inline-flex items-center gap-1"><Monitor size={16} />形式: {getModeLabel(post.mode)}</span>
              <span className="inline-flex items-center gap-1"><UsersRound size={16} />募集人数: {post.max_participants ? `${post.max_participants}人` : '任意'}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={16} />開催予定日: {formatDate(post.scheduled_at)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{post.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            <div className="rounded-xl bg-theme-accent-soft/60 p-3 text-sm font-black text-theme-main-dark">{t('board.interests')} {post.interest_count}件 / {t('board.accepted')} {post.accepted_count}件</div>
            {canUseFounderPostModeration ? (
              <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50/45 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Badge className="bg-white text-amber-700"><ShieldAlert size={14} />管理者操作</Badge>
                    <p className="text-xs font-bold leading-5 text-theme-muted">不適切な募集を削除せずに非表示化し、必要に応じて戻せます。</p>
                  </div>
                  <Button disabled={saving} onClick={() => { void handleFounderTogglePostVisibility(); }} type="button" variant={post.status === 'archived' ? 'secondary' : 'danger'}>
                    {post.status === 'archived' ? '募集を戻す' : '募集を非表示にする'}
                  </Button>
                </div>
              </div>
            ) : null}
            {isOwnPost ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <a className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-theme-sky/30 bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 px-4 py-2 text-[13px] font-bold text-theme-main-dark shadow-sm shadow-theme-sky/15" href="#activity-participants"><UsersRound size={16} />参加者を管理</a>
                <Link className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-theme-main px-4 py-2 text-[13px] font-bold text-white" to={`/board/${post.id}/edit`}><Pencil size={16} />募集内容を編集</Link>
              </div>
            ) : null}
            {isOwnPost && post.status !== 'archived' ? (
              <Button className="w-full" disabled={saving || !useSupabaseBoard} onClick={() => { void handleOwnerWithdrawPost(); }} type="button" variant="danger">
                <Trash2 size={16} />募集を取り下げる
              </Button>
            ) : null}
            {isOwnPost && post.status === 'archived' ? (
              <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-700">{post.moderation_locked ? 'この募集は管理者により非表示になっています。投稿者から再表示することはできません。' : 'この募集は取り下げ済みです。募集一覧には表示されません。'}</p>
            ) : null}
            {!isOwnPost ? (
              <div className="space-y-2 rounded-2xl border border-theme-sky/20 bg-theme-card/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={myInterest ? getInterestStatusClass(myInterest.status) : 'bg-theme-card text-theme-main-dark'}>{myInterest ? getInterestStatusLabel(myInterest.status, t) : '未参加'}</Badge>
                  <p className="text-sm font-black text-theme-text">{getParticipantStatusMessage(myInterest?.status ?? null, t)}</p>
                </div>
                {myInterest?.status === 'accepted' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button className="bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 text-theme-main-dark shadow-sm shadow-theme-sky/20" disabled={saving || !useSupabaseBoard} onClick={() => void handleOpenMyConversation()} variant="secondary">
                      <MessageSquareText size={16} />{t('board.detail.messageHost')}
                    </Button>
                    <Button disabled={saving || !useSupabaseBoard} onClick={handleInterest} variant="secondary">
                      <UsersRound size={16} />{t('board.detail.cancelInterest')}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" disabled={saving || !useSupabaseBoard || post.status !== 'open'} onClick={handleInterest}>
                    <UsersRound size={16} />{myInterest?.status === 'interested' ? t('board.detail.cancelInterest') : t('board.detail.interestedButton')}
                  </Button>
                )}
              </div>
            ) : null}
            {!useSupabaseBoard ? <p className="text-xs font-bold text-theme-muted">Supabaseログイン時に{t('board.detail.interestedPeople')}を管理できます。</p> : null}
            {isOwnPost ? <p className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold leading-6 text-theme-muted">承認済みになると、参加者と1対1の会話を始められます。</p> : null}
          </Card>

          {isOwnPost ? (
            <Card className="space-y-4" id="activity-participants">
              <div className="space-y-2">
                <h2 className="flex items-center gap-1.5 text-lg font-black text-theme-text"><UsersRound size={18} />{t('board.detail.interestedPeople')}</h2>
                <p className="text-sm leading-6 text-theme-muted">この募集に興味を持っている人を確認し、{t('board.detail.accept')} / {t('board.detail.pass')}できます。</p>
                <p className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold leading-6 text-theme-muted">承認済みになると、参加者と1対1の会話を始められます。まずは日程や進め方を相談してみましょう。</p>
              </div>
              {interestError ? <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{interestError}</div> : null}
              {interestsLoading ? <p className="text-sm font-bold text-theme-muted">{t('board.detail.interestedPeople')}を読み込んでいます...</p> : null}
              {!interestsLoading && interests.length === 0 ? <p className="text-sm font-bold text-theme-muted">まだ{t('board.detail.interestedPeople')}はいません。</p> : null}
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
                      <Badge className={getInterestStatusClass(interest.status)}>{getInterestStatusLabel(interest.status, t)}</Badge>
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
                            <Button disabled={updatingInterestId === interest.id} onClick={() => void handleOwnerStatusChange(interest.id, 'accepted')} variant="secondary"><CheckCircle2 size={16} />{t('board.detail.accept')}</Button>
                            <Button disabled={updatingInterestId === interest.id} onClick={() => void handleOwnerStatusChange(interest.id, 'declined')} variant="danger"><XCircle size={16} />{t('board.detail.pass')}</Button>
                          </>
                        ) : null}
                        {interest.status === 'accepted' ? (
                          <>
                            <span className="inline-flex min-h-11 items-center rounded-xl bg-cyan-50 px-4 py-2 text-[13px] font-black text-cyan-700">{t('board.accepted')}</span>
                            <Button className="!min-h-9 !rounded-full border-theme-sky/25 bg-gradient-to-r from-theme-yellow/65 to-theme-sky/35 !px-3 !py-1.5 !text-xs text-theme-main-dark shadow-sm shadow-theme-sky/10" disabled={openingConversationId === interest.id} onClick={() => void handleOpenConversation(interest)} variant="secondary"><MessageSquareText size={15} />{openingConversationId === interest.id ? '会話を準備中…' : language === 'en' ? t('board.detail.message') : `${interest.profile?.name ?? '参加者'}さんと会話`}</Button>
                          </>
                        ) : null}
                        {interest.status === 'declined' ? <span className="inline-flex min-h-11 items-center rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-black text-slate-600">{t('board.detail.passed')}</span> : null}
                        {interest.status === 'cancelled' ? <span className="inline-flex min-h-11 items-center rounded-xl bg-orange-50 px-4 py-2 text-[13px] font-black text-orange-700">{t('myInterests.canceled')}</span> : null}
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
