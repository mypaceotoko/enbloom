import { useState, type FormEvent } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ActivityPostForm } from '../components/ActivityPostForm';
import { parseActivityPostTags } from '../lib/activityPostFormUtils';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { activityPostCategories } from '../data/mockActivityPosts';
import { demoChatRooms } from '../data/mockChatRooms';
import { useAuth } from '../hooks/useAuth';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import { createActivityPost } from '../lib/activityBoardApi';
import type { ActivityPostEditFormState } from '../types/activityBoard';

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

export function ActivityBoardNewPage() {
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceRoomSlug = searchParams.get('roomId') ?? '';
  const sourceRoom = demoChatRooms.find((room) => room.slug === sourceRoomSlug) ?? null;
  const [form, setForm] = useState<ActivityPostEditFormState>(initialForm);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const canCreate = isSupabaseMode && isAuthenticated;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      setNotice('ログインすると募集を投稿できます。');
      return;
    }

    setSaving(true);
    setNotice('');
    try {
      const post = await createActivityPost({
        title: form.title,
        body: form.body,
        category: form.category,
        area: form.location,
        tags: parseActivityPostTags(form.tags),
        max_participants: form.capacity ? Number(form.capacity) : null,
        scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        mode: form.mode,
        status: 'open',
        room_id: sourceRoomSlug || null,
      });
      navigate(`/board/${post.id}`);
    } catch (caughtError) {
      console.warn('[ConnectBloom] activity post create page failed', getSafeErrorLog(caughtError, 'activity_post_create_page_failed'));
      setNotice(getShortErrorMessage(caughtError, '募集の保存に失敗しました。時間を置いてもう一度お試しください。'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell description="一緒にやりたいこと、話したいテーマ、探している仲間を投稿できます。" eyebrow="New Activity" title="募集を作成">
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/board"><ArrowLeft size={16} />募集ボードへ戻る</Link>

      {!canCreate ? (
        <Card className="space-y-2">
          <Badge>デモ表示</Badge>
          <p className="text-sm font-bold text-theme-text">ログインすると募集を投稿できます。</p>
          <p className="text-sm leading-6 text-theme-muted">ログイン前は、デモ募集の一覧と詳細を見られます。</p>
        </Card>
      ) : null}

      {sourceRoom ? (
        <Card className="space-y-2">
          <Badge>ルームから作成</Badge>
          <p className="text-sm font-bold text-theme-text">{sourceRoom.name}の会話から募集を作成しています。</p>
          <p className="text-sm leading-6 text-theme-muted">作成後の募集にはルーム由来の案内を表示します。</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      <Card>
        <ActivityPostForm cancelTo="/board" form={form} saving={saving} submitLabel="募集を投稿する" onChange={setForm} onSubmit={handleSubmit} />
        <div className="mt-4 rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold text-theme-muted"><Plus className="mr-1 inline size-4" />ステータスは open（募集中）で作成されます。</div>
      </Card>
    </PageShell>
  );
}
