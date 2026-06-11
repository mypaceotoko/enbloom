import { useEffect, useState } from 'react';
import { Archive, CalendarDays, MapPin, MessageSquareText, Pencil, RotateCcw, Trash2, UsersRound, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockActivityPosts } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../lib/i18n';
import { closeActivityPost, deleteActivityPostForOwner, getActivityPostInterestsForOwner, getMyActivityPosts, reopenActivityPost, restoreActivityPostForOwner, withdrawActivityPost } from '../lib/activityBoardApi';
import { formatConversationFailureMessage, getActivityInterestConversationPath } from '../lib/matchApi';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import type { ActivityPostInterestWithProfile, ActivityPostStatus, ActivityPostWithStats } from '../types/activityBoard';

function formatDate(value: string | null) {
  if (!value) return '未定';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(new Date(value));
}

function getStatusLabel(status: ActivityPostStatus, t: (key: TranslationKey) => string) {
  if (status === 'closed') return t('board.closed');
  if (status === 'archived') return t('board.archived');
  return t('board.open');
}

export function MyBoardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<ActivityPostWithStats[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [acceptedInterestsByPostId, setAcceptedInterestsByPostId] = useState<Record<string, ActivityPostInterestWithProfile[]>>({});
  const [openingInterestId, setOpeningInterestId] = useState<string | null>(null);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      setError('');
      setNotice('');

      if (!useSupabaseBoard) {
        setPosts(mockActivityPosts.slice(0, 1).map((post) => ({ ...post, post_id: post.id })));
        setNotice('デモ表示ではサンプル募集を表示しています。ログインすると自分の募集を管理できます。');
        return;
      }

      if (!user?.id) {
        setPosts([]);
        setAcceptedInterestsByPostId({});
        setError('ログイン状態を確認できませんでした');
        return;
      }

      setLoading(true);
      try {
        const nextPosts = await getMyActivityPosts(user.id);
        const acceptedEntries = await Promise.all(
          nextPosts
            .filter((post) => post.accepted_count > 0)
            .map(async (post) => [post.id, (await getActivityPostInterestsForOwner(post.id)).filter((interest) => interest.status === 'accepted')] as const),
        );
        if (!mounted) return;
        setPosts(nextPosts);
        setAcceptedInterestsByPostId(Object.fromEntries(acceptedEntries));
      } catch (caughtError) {
        if (!mounted) return;
        console.warn('[ConnectBloom] my activity posts fetch failed', getSafeErrorLog(caughtError, 'my_activity_posts_fetch_failed'));
        setPosts([]);
        setError(getShortErrorMessage(caughtError, '自分の募集一覧の取得に失敗しました。時間を置いてもう一度お試しください。'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPosts();
    return () => {
      mounted = false;
    };
  }, [useSupabaseBoard, user?.id]);

  function applyPostStatus(postId: string, status: ActivityPostStatus, closedAt?: string | null, moderationLocked?: boolean) {
    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, status, closed_at: closedAt ?? post.closed_at, moderation_locked: moderationLocked ?? post.moderation_locked } : post
    )));
  }

  async function handleOpenConversation(postId: string, interest: ActivityPostInterestWithProfile) {
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
      const result = await getActivityInterestConversationPath({ postId, interestId: interest.id, targetUserId: interest.user_id });
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

  async function handleClose(postId: string) {
    if (!useSupabaseBoard) return;
    const confirmed = window.confirm('この募集を締め切りますか？');
    if (!confirmed) return;

    setUpdatingPostId(postId);
    setError('');
    try {
      const updated = await closeActivityPost(postId);
      applyPostStatus(postId, updated.status, updated.closed_at);
      setNotice('募集を締め切りました。');
    } catch (caughtError) {
      setError(getShortErrorMessage(caughtError, '募集の締切に失敗しました。時間を置いてもう一度お試しください。'));
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function handleReopen(postId: string) {
    if (!useSupabaseBoard) return;
    const confirmed = window.confirm('この募集を再開しますか？');
    if (!confirmed) return;

    setUpdatingPostId(postId);
    setError('');
    try {
      const updated = await reopenActivityPost(postId);
      applyPostStatus(postId, updated.status, updated.closed_at);
      setNotice('募集を再開しました。');
    } catch (caughtError) {
      setError(getShortErrorMessage(caughtError, '募集の再開に失敗しました。時間を置いてもう一度お試しください。'));
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function handleOwnerRestore(post: ActivityPostWithStats) {
    if (!useSupabaseBoard) return;

    setUpdatingPostId(post.id);
    setError('');
    try {
      const restored = await restoreActivityPostForOwner(post.id);
      applyPostStatus(post.id, restored.status, null, false);
      setPosts((current) => current.map((currentPost) => (
        currentPost.id === post.id ? { ...currentPost, archived_by: null, archived_at: null, updated_at: new Date().toISOString() } : currentPost
      )));
      setNotice('募集を再開しました');
    } catch (caughtError) {
      console.warn('[ConnectBloom] activity post owner restore failed', {
        action: 'owner_restore_activity_post',
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        postId: post.id,
        postOwnerId: post.created_by,
        isOwner: Boolean(user?.id && post.created_by === user.id),
        statusBefore: post.status,
        moderationLocked: Boolean(post.moderation_locked),
        rpcName: 'owner_restore_activity_post',
        rpcPayloadKeys: ['p_post_id'],
        ...getSafeErrorLog(caughtError, 'owner_restore_activity_post'),
      });
      setError(getShortErrorMessage(caughtError, '募集の再開に失敗しました'));
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function handleOwnerDelete(post: ActivityPostWithStats) {
    if (!useSupabaseBoard) return;
    const confirmed = window.confirm('募集を完全削除しますか？\n\nこの操作は元に戻せません。');
    if (!confirmed) return;

    setUpdatingPostId(post.id);
    setError('');
    try {
      await deleteActivityPostForOwner(post.id);
      setPosts((current) => current.filter((currentPost) => currentPost.id !== post.id));
      setNotice('募集を完全削除しました');
    } catch (caughtError) {
      console.warn('[ConnectBloom] activity post owner delete failed', {
        action: 'owner_delete_activity_post',
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        postId: post.id,
        postOwnerId: post.created_by,
        isOwner: Boolean(user?.id && post.created_by === user.id),
        statusBefore: post.status,
        moderationLocked: Boolean(post.moderation_locked),
        rpcName: 'owner_delete_activity_post',
        rpcPayloadKeys: ['p_post_id'],
        ...getSafeErrorLog(caughtError, 'owner_delete_activity_post'),
      });
      setError(getShortErrorMessage(caughtError, '募集の完全削除に失敗しました'));
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function handleArchive(post: ActivityPostWithStats) {
    if (!useSupabaseBoard) return;
    const confirmed = window.confirm('この募集を取り下げますか？');
    if (!confirmed) return;

    setUpdatingPostId(post.id);
    setError('');
    try {
      await withdrawActivityPost(post.id);
      setPosts((current) => current.filter((currentPost) => currentPost.id !== post.id));
      setNotice('募集を取り下げました');
    } catch (caughtError) {
      setError(getShortErrorMessage(caughtError, '募集の取り下げに失敗しました'));
    } finally {
      setUpdatingPostId(null);
    }
  }

  return (
    <PageShell description={t('myBoard.description')} eyebrow="My Activity Board" title={t('myBoard.title')}>
      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {error ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <Badge className="bg-gradient-to-r from-theme-yellow/85 to-theme-sky/45 text-theme-main-dark"><UsersRound size={13} />{t('board.badge')}</Badge>
          <p className="mt-2 text-sm leading-6 text-theme-muted">{t('myBoard.hint')}</p>
        </div>
      </Card>

      {loading ? <Card className="text-sm font-bold text-theme-muted">自分の募集を読み込んでいます...</Card> : null}
      {!loading && posts.length === 0 ? (
        <Card className="space-y-2 text-center">
          <p className="text-base font-black text-theme-text">まだ自分の募集はありません</p>
          <p className="text-sm leading-6 text-theme-muted">一緒にやりたいことを投稿すると、ここで参加希望を管理できます。</p>
          <Link className="inline-flex text-sm font-black text-theme-main-dark" to="/board/new">募集を作成する</Link>
        </Card>
      ) : null}

      <div className="space-y-4">
        {posts.map((post) => (
          <Card className="space-y-3" key={post.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Badge>{post.category}</Badge>
                <h2 className="mt-2 text-lg font-black leading-tight text-theme-text">{post.title}</h2>
              </div>
              <Badge className="bg-theme-card shadow-sm">{getStatusLabel(post.status, t)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-theme-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><MapPin size={14} />{post.area || '活動エリア未設定'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><CalendarDays size={14} />作成 {formatDate(post.created_at)}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><UsersRound size={14} />{t('board.interests')} {post.interest_count}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-soft/60 px-2.5 py-1"><UsersRound size={14} />{t('board.accepted')} {post.accepted_count}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{post.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            {acceptedInterestsByPostId[post.id]?.length ? (
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/45 p-3">
                <p className="text-xs font-black text-cyan-700">{t('board.accepted')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {acceptedInterestsByPostId[post.id].map((interest) => (
                    <Button className="!min-h-9 !rounded-full border-theme-sky/25 bg-gradient-to-r from-theme-yellow/65 to-theme-sky/35 !px-3 !py-1.5 !text-xs text-theme-main-dark shadow-sm shadow-theme-sky/10" disabled={openingInterestId === interest.id} key={interest.id} onClick={() => void handleOpenConversation(post.id, interest)} variant="secondary"><MessageSquareText size={15} />{openingInterestId === interest.id ? '会話を準備中…' : language === 'en' ? t('myBoard.message') : `${interest.profile?.name ?? '参加者'}${t('myBoard.message')}`}</Button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="space-y-2 border-t border-white/60 pt-3">
              {post.status === 'archived' && post.moderation_locked ? (
                <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-700">この募集は管理者により非表示になっています。投稿者から再開や完全削除はできません。</p>
              ) : null}
              {post.status === 'archived' && !post.moderation_locked ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button className="min-h-10 px-3 py-2 text-xs" disabled={!useSupabaseBoard || updatingPostId === post.id} onClick={() => void handleOwnerRestore(post)} variant="secondary"><RotateCcw size={15} />再開</Button>
                  <Button className="min-h-10 px-3 py-2 text-xs" disabled={!useSupabaseBoard || updatingPostId === post.id} onClick={() => void handleOwnerDelete(post)} variant="danger"><Trash2 size={15} />完全削除</Button>
                </div>
              ) : null}
              {post.status !== 'archived' && !post.moderation_locked ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-theme-sky/30 bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 px-3 py-2 text-[13px] font-black text-theme-main-dark shadow-sm shadow-theme-sky/15" to={`/board/${post.id}`}><UsersRound size={16} />{t('myBoard.manage')}</Link>
                    <Link className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-theme-accent-soft px-3 py-2 text-[13px] font-black text-theme-text" to={`/board/${post.id}/edit`}><Pencil size={16} />{t('myBoard.edit')}</Link>
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-3">
                    <Button className="min-h-9 px-3 py-1.5 text-xs" disabled={!useSupabaseBoard || updatingPostId === post.id || post.status !== 'open'} onClick={() => void handleClose(post.id)} variant="secondary"><XCircle size={15} />{t('myBoard.close')}</Button>
                    <Button className="min-h-9 px-3 py-1.5 text-xs" disabled={!useSupabaseBoard || updatingPostId === post.id || post.status !== 'closed'} onClick={() => void handleReopen(post.id)} variant="secondary"><RotateCcw size={15} />{t('myBoard.reopen')}</Button>
                    <Button className="min-h-9 px-3 py-1.5 text-xs" disabled={!useSupabaseBoard || updatingPostId === post.id || post.status !== 'open'} onClick={() => void handleArchive(post)} variant="danger"><Archive size={15} />{t('myBoard.archive')}</Button>
                  </div>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
