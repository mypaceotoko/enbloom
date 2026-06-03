import { useEffect, useState } from 'react';
import { Archive, CalendarDays, Eye, MapPin, Pencil, RotateCcw, Trash2, UsersRound, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockActivityPosts } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import { archiveActivityPost, closeActivityPost, deleteActivityPost, getMyActivityPosts, reopenActivityPost } from '../lib/activityBoardApi';
import type { ActivityPostStatus, ActivityPostWithStats } from '../types/activityBoard';

function formatDate(value: string | null) {
  if (!value) return '未定';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(new Date(value));
}

function getStatusLabel(status: ActivityPostStatus) {
  if (status === 'closed') return '締切済み';
  if (status === 'archived') return 'アーカイブ';
  return '募集中';
}

export function MyBoardPage() {
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [posts, setPosts] = useState<ActivityPostWithStats[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      setError('');
      setNotice('');

      if (!useSupabaseBoard) {
        setPosts(mockActivityPosts.slice(0, 1).map((post) => ({ ...post, post_id: post.id })));
        setNotice('ローカルデモではサンプル募集を表示しています。ログインすると自分の募集を管理できます。');
        return;
      }

      if (!user?.id) {
        setPosts([]);
        setError('ログイン状態を確認できませんでした');
        return;
      }

      setLoading(true);
      try {
        const nextPosts = await getMyActivityPosts(user.id);
        if (!mounted) return;
        setPosts(nextPosts);
      } catch (caughtError) {
        if (!mounted) return;
        console.warn('[ConnectBloom] my activity posts fetch failed', { success: false });
        setPosts([]);
        setError(caughtError instanceof Error ? `自分の募集一覧の取得に失敗しました: ${caughtError.message}` : '自分の募集一覧の取得に失敗しました');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPosts();
    return () => {
      mounted = false;
    };
  }, [useSupabaseBoard, user?.id]);

  function applyPostStatus(postId: string, status: ActivityPostStatus, closedAt?: string | null) {
    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, status, closed_at: closedAt ?? post.closed_at } : post
    )));
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
      setError(caughtError instanceof Error ? `募集の締切に失敗しました: ${caughtError.message}` : '募集の締切に失敗しました');
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
      setError(caughtError instanceof Error ? `募集の再開に失敗しました: ${caughtError.message}` : '募集の再開に失敗しました');
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function handleDelete(post: ActivityPostWithStats) {
    if (!useSupabaseBoard) return;
    const hasInterests = post.interest_count > 0 || post.accepted_count > 0;
    const confirmed = window.confirm(hasInterests
      ? '参加希望があるため完全削除せず、アーカイブします。よろしいですか？'
      : '参加希望がない募集を完全削除します。よろしいですか？');
    if (!confirmed) return;

    setUpdatingPostId(post.id);
    setError('');
    try {
      if (hasInterests) {
        const updated = await archiveActivityPost(post.id);
        applyPostStatus(post.id, updated.status, updated.closed_at);
        setNotice('募集をアーカイブしました。');
      } else {
        await deleteActivityPost(post.id);
        setPosts((current) => current.filter((item) => item.id !== post.id));
        setNotice('募集を削除しました。');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? `募集の削除に失敗しました: ${caughtError.message}` : '募集の削除に失敗しました');
    } finally {
      setUpdatingPostId(null);
    }
  }

  return (
    <PageShell description="自分が投稿した募集と、届いた参加希望を管理できます。" eyebrow="My Activity Board" title="自分の募集">
      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {error ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <Badge className="bg-gradient-to-r from-theme-yellow/85 to-theme-sky/45 text-theme-main-dark"><UsersRound size={13} />紹介から広がるつながり</Badge>
          <p className="mt-2 text-sm leading-6 text-theme-muted">小さく始める活動、共創テーマ、探している仲間を、募集単位で整理できます。</p>
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
              <Badge className="bg-theme-card shadow-sm">{getStatusLabel(post.status)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-theme-muted">
              <span className="inline-flex items-center gap-1"><MapPin size={14} />{post.area || '活動エリア未設定'}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={14} />作成 {formatDate(post.created_at)}</span>
              <span className="inline-flex items-center gap-1"><UsersRound size={14} />参加希望数 {post.interest_count}</span>
              <span className="inline-flex items-center gap-1"><UsersRound size={14} />承認済み数 {post.accepted_count}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{post.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            <div className="grid gap-2 border-t border-white/60 pt-3 sm:grid-cols-2 lg:grid-cols-6">
              <Link className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-theme-accent-soft px-4 py-2 text-[13px] font-bold text-theme-text" to={`/board/${post.id}`}><Eye size={16} />詳細を見る</Link>
              <Link className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-theme-sky/30 bg-gradient-to-r from-theme-yellow/85 to-theme-sky/55 px-4 py-2 text-[13px] font-bold text-theme-main-dark shadow-sm shadow-theme-sky/15" to={`/board/${post.id}`}><UsersRound size={16} />管理する</Link>
              <Link className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-theme-accent-soft px-4 py-2 text-[13px] font-bold text-theme-text" to={`/board/${post.id}/edit`}><Pencil size={16} />編集する</Link>
              <Button disabled={!useSupabaseBoard || updatingPostId === post.id || post.status !== 'open'} onClick={() => void handleClose(post.id)} variant="secondary"><XCircle size={16} />募集を締め切る</Button>
              <Button disabled={!useSupabaseBoard || updatingPostId === post.id || post.status === 'open'} onClick={() => void handleReopen(post.id)} variant="secondary"><RotateCcw size={16} />再開する</Button>
              <Button disabled={!useSupabaseBoard || updatingPostId === post.id} onClick={() => void handleDelete(post)} variant="danger">{post.interest_count > 0 || post.accepted_count > 0 ? <Archive size={16} /> : <Trash2 size={16} />}削除する</Button>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
