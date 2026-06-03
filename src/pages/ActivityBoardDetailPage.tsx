import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Monitor, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockActivityPosts } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import { cancelInterest, expressInterest, getActivityPostById, getMyInterestedPostIds } from '../lib/activityBoardApi';
import type { ActivityPostMode, ActivityPostWithAuthor } from '../types/activityBoard';

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

export function ActivityBoardDetailPage() {
  const { postId = '' } = useParams();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [post, setPost] = useState<ActivityPostWithAuthor | null>(null);
  const [interested, setInterested] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;
  const isOwnPost = Boolean(user?.id && post?.created_by === user.id);

  useEffect(() => {
    let mounted = true;

    async function loadPost() {
      if (!postId) return;
      if (!useSupabaseBoard) {
        setPost(mockActivityPosts.find((item) => item.id === postId) ?? null);
        setNotice('ログインすると参加したいを送れます。');
        return;
      }

      setLoading(true);
      setNotice('');
      try {
        const [nextPost, interestedIds] = await Promise.all([
          getActivityPostById(postId),
          user ? getMyInterestedPostIds(user.id) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setPost(nextPost);
        setInterested(interestedIds.includes(postId));
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
  }, [postId, useSupabaseBoard, user]);

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
        await cancelInterest(post.id);
        setInterested(false);
        setPost({ ...post, interest_count: Math.max(0, post.interest_count - 1) });
        setNotice('参加したいを取り消しました。');
      } else {
        await expressInterest(post.id);
        setInterested(true);
        setPost({ ...post, interest_count: post.interest_count + 1 });
        setNotice('参加したいを送りました。');
      }
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? `参加したいの保存に失敗しました: ${caughtError.message}` : '参加したいの保存に失敗しました。');
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
            <div className="rounded-xl bg-theme-accent-soft/60 p-3 text-sm font-black text-theme-main-dark">参加したい {post.interest_count}件</div>
            <Button className="w-full" disabled={saving || !useSupabaseBoard || isOwnPost || post.status !== 'open'} onClick={handleInterest}>
              <UsersRound size={16} />{interested ? '参加したいを取り消す' : '参加したい'}
            </Button>
            {!useSupabaseBoard ? <p className="text-xs font-bold text-theme-muted">ログインすると参加したいを送れます。</p> : null}
            {isOwnPost ? <p className="text-xs font-bold text-theme-muted">自分の投稿です。編集導線は第一弾では表示のみです。</p> : null}
          </Card>
          <Card className="space-y-3">
            <h2 className="text-base font-black text-theme-text">投稿者プロフィール概要</h2>
            <div className="flex items-start gap-3">
              <div className={`size-12 shrink-0 rounded-2xl bg-gradient-to-br ${post.author?.gradient ?? 'from-emerald-100 to-pink-100'}`} />
              <div className="space-y-1">
                <p className="font-black text-theme-text">{post.author?.name ?? 'EnBloomユーザー'}</p>
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
