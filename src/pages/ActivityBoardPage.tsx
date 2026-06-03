import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Filter, MapPin, Plus, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { activityPostCategories, mockActivityPosts } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import { getActivityPosts } from '../lib/activityBoardApi';
import type { ActivityPostWithAuthor } from '../types/activityBoard';

function formatDate(value: string | null) {
  if (!value) return '未定';
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === 'closed') return '締切';
  if (status === 'archived') return 'アーカイブ';
  return '募集中';
}

export function ActivityBoardPage() {
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [posts, setPosts] = useState<ActivityPostWithAuthor[]>(mockActivityPosts);
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;
  const allTags = useMemo(() => [...new Set(posts.flatMap((post) => post.tags))].slice(0, 12), [posts]);

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      if (!useSupabaseBoard) {
        setPosts(mockActivityPosts);
        setNotice('ローカルデモでは募集の一覧・詳細を確認できます。ログインすると募集を投稿できます。');
        return;
      }

      setLoading(true);
      setNotice('');
      try {
        const nextPosts = await getActivityPosts({ category: category || undefined, tag: tag || undefined });
        if (!mounted) return;
        setPosts(nextPosts);
      } catch (caughtError) {
        if (!mounted) return;
        setPosts([]);
        setNotice(caughtError instanceof Error ? `募集の取得に失敗しました: ${caughtError.message}` : '募集の取得に失敗しました。');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPosts();
    return () => {
      mounted = false;
    };
  }, [category, tag, useSupabaseBoard]);

  const visiblePosts = useSupabaseBoard
    ? posts
    : posts.filter((post) => (!category || post.category === category) && (!tag || post.tags.includes(tag)));

  function isOwnPost(post: ActivityPostWithAuthor) {
    return Boolean(useSupabaseBoard && user?.id && post.created_by === user.id);
  }

  return (
    <PageShell description="一緒にやりたいこと、話したいテーマ、探している仲間を投稿できます。" eyebrow="Activity Board" title="募集ボード">
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Badge className="bg-theme-main text-white"><UsersRound size={13} />紹介から広がるつながり</Badge>
              <p className="text-sm leading-6 text-theme-muted">小さく始める活動、興味タグ、共創テーマから仲間を探せます。</p>
            </div>
            <Button className="shrink-0" disabled={!useSupabaseBoard} onClick={() => { if (useSupabaseBoard) window.location.href = '/board/new'; }}>
              <Plus size={16} />募集作成
            </Button>
          </div>
          {!useSupabaseBoard ? <p className="mt-3 text-xs font-bold text-theme-main-dark">ログインすると募集を投稿できます。</p> : null}
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 text-xs font-black">
        <Link className="rounded-full bg-theme-card/86 px-3 py-2 text-theme-main-dark shadow-sm transition hover:bg-theme-accent-soft" to="/my-board">自分の募集を見る</Link>
        <Link className="rounded-full bg-theme-card/86 px-3 py-2 text-theme-main-dark shadow-sm transition hover:bg-theme-accent-soft" to="/my-interests">参加希望した募集を見る</Link>
      </div>

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      <Card className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm font-black text-theme-main-dark"><Filter size={16} />カテゴリ/タグの簡易フィルター</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-theme-text">
            <span>活動ジャンル</span>
            <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">すべて</option>
              {activityPostCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-theme-text">
            <span>興味タグ</span>
            <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" value={tag} onChange={(event) => setTag(event.target.value)}>
              <option value="">すべて</option>
              {allTags.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <div className="space-y-4">
        {loading ? <Card className="text-sm font-bold text-theme-muted">募集を読み込んでいます...</Card> : null}
        {!loading && visiblePosts.length === 0 ? (
          <Card className="space-y-2 text-center">
            <p className="text-base font-black text-theme-text">まだ募集がありません</p>
            <p className="text-sm leading-6 text-theme-muted">一緒にやりたいことや探している仲間を、最初の募集として投稿してみましょう。</p>
          </Card>
        ) : null}
        {visiblePosts.map((post) => (
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
              <span className="inline-flex items-center gap-1"><UsersRound size={14} />参加希望 {post.interest_count}件</span>
            </div>
            {isOwnPost(post) ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-black text-theme-main-dark">
                <Badge className="bg-theme-main text-white">自分の募集</Badge>
                <span>参加希望 {post.interest_count}件</span>
                <Link className="underline decoration-2 underline-offset-4" to={`/board/${post.id}`}>管理する</Link>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">{post.tags.map((item) => <Badge key={item}>#{item}</Badge>)}</div>
            <div className="flex items-center justify-between gap-3 border-t border-white/60 pt-3">
              <span className="text-xs font-bold text-theme-muted">投稿者: {post.author?.name ?? 'ConnectBloomユーザー'}</span>
              <Link className="text-sm font-black text-theme-main-dark" to={`/board/${post.id}`}>詳細を見る</Link>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
