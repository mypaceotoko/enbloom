import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityPostForm } from '../components/ActivityPostForm';
import { parseActivityPostTags } from '../lib/activityPostFormUtils';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { activityPostCategories } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import { canEditActivityPost, getActivityPostById, updateActivityPost } from '../lib/activityBoardApi';
import type { ActivityPostEditFormState, ActivityPostMode, ActivityPostStatus } from '../types/activityBoard';

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

const initialForm: ActivityPostEditFormState = {
  title: '',
  body: '',
  category: activityPostCategories[0] ?? '',
  location: '',
  tags: '',
  capacity: '',
  scheduledAt: '',
  mode: 'hybrid',
  status: 'open',
};

function normalizeMode(mode: ActivityPostMode): ActivityPostMode {
  return mode === 'either' ? 'hybrid' : mode;
}

export function ActivityBoardEditPage() {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [form, setForm] = useState<ActivityPostEditFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const useSupabaseBoard = isSupabaseMode && isAuthenticated;

  useEffect(() => {
    let mounted = true;

    async function loadPost() {
      setNotice('');
      setError('');
      setCanEdit(false);

      if (!useSupabaseBoard) return;

      if (!user?.id) {
        setError('ログイン状態を確認できませんでした');
        return;
      }

      setLoading(true);
      try {
        const [post, editable] = await Promise.all([
          getActivityPostById(postId),
          canEditActivityPost(postId, user.id),
        ]);
        if (!mounted) return;

        if (!post) {
          setError('募集内容の取得に失敗しました');
          return;
        }

        if (!editable) {
          setCanEdit(false);
          setError('この募集を編集する権限がありません');
          return;
        }

        setCanEdit(true);
        setForm({
          title: post.title,
          body: post.body,
          category: post.category,
          location: post.area ?? '',
          tags: post.tags.join(', '),
          capacity: post.max_participants ? String(post.max_participants) : '',
          scheduledAt: toDateTimeLocal(post.scheduled_at),
          mode: normalizeMode(post.mode),
          status: post.status === 'archived' ? 'closed' : post.status,
        });
      } catch (caughtError) {
        if (!mounted) return;
        console.warn('[ConnectBloom] activity post edit fetch failed', { success: false });
        setError(getShortErrorMessage(caughtError, '募集内容の取得に失敗しました。時間を置いてもう一度お試しください。'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPost();
    return () => {
      mounted = false;
    };
  }, [postId, useSupabaseBoard, user?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!useSupabaseBoard) {
      setNotice('ログインすると自分の募集を編集できます');
      return;
    }

    if (!user?.id) {
      setError('ログイン状態を確認できませんでした');
      return;
    }

    if (!form.title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    if (!form.body.trim()) {
      setError('本文を入力してください');
      return;
    }

    if (!form.category.trim()) {
      setError('活動ジャンルを選択してください');
      return;
    }

    setSaving(true);
    try {
      const editable = await canEditActivityPost(postId, user.id);
      if (!editable) {
        setCanEdit(false);
        setError('この募集を編集する権限がありません');
        return;
      }

      await updateActivityPost(postId, {
        title: form.title,
        body: form.body,
        category: form.category,
        location: form.location,
        tags: parseActivityPostTags(form.tags),
        capacity: form.capacity ? Number(form.capacity) : null,
        scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        mode: form.mode,
        status: form.status as ActivityPostStatus,
      });
      navigate(`/board/${postId}`, { state: { message: '募集内容を保存しました' } });
    } catch (caughtError) {
      console.warn('[ConnectBloom] activity post update page failed', getSafeErrorLog(caughtError, 'activity_post_update_page_failed'));
      setError(getShortErrorMessage(caughtError, '募集内容の保存に失敗しました。時間を置いてもう一度お試しください。'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell description="募集内容はあとから整えられます。参加希望が届いている場合は、内容が大きく変わりすぎないように注意してください。" eyebrow="Edit Activity" title="募集を編集">
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to={`/board/${postId}`}><ArrowLeft size={16} />募集詳細へ戻る</Link>

      {!useSupabaseBoard ? (
        <Card className="space-y-2">
          <Badge>デモ表示</Badge>
          <p className="text-sm font-bold text-theme-text">ログインすると自分の募集を編集できます</p>
          <p className="text-sm leading-6 text-theme-muted">ログイン前は、募集編集の保存は行いません。</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {error ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
      {loading ? <Card className="text-sm font-bold text-theme-muted">募集内容を読み込んでいます...</Card> : null}

      {useSupabaseBoard && error === 'この募集を編集する権限がありません' ? (
        <Card className="space-y-3 text-center">
          <p className="text-base font-black text-theme-text">この募集を編集する権限がありません</p>
          <Link className="inline-flex justify-center text-sm font-black text-theme-main-dark" to={`/board/${postId}`}>募集詳細へ戻る</Link>
        </Card>
      ) : null}

      {useSupabaseBoard && canEdit ? (
        <Card className="space-y-4">
          <div className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold leading-6 text-theme-muted">
            <Pencil className="mr-1 inline size-4" />募集内容はあとから整えられます。参加希望が届いている場合は、内容が大きく変わりすぎないように注意してください。
          </div>
          <ActivityPostForm cancelTo={`/board/${postId}`} form={form} saving={saving} showStatus submitLabel="編集内容を保存" onChange={setForm} onSubmit={handleSubmit} />
        </Card>
      ) : null}
    </PageShell>
  );
}
