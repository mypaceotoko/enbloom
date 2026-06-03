import { useState, type FormEvent } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { activityPostCategories, activityPostModes } from '../data/mockActivityPosts';
import { useAuth } from '../hooks/useAuth';
import { createActivityPost } from '../lib/activityBoardApi';
import type { ActivityPostMode } from '../types/activityBoard';

export function ActivityBoardNewPage() {
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(activityPostCategories[0]);
  const [area, setArea] = useState('');
  const [tags, setTags] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [mode, setMode] = useState<ActivityPostMode>('either');
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
        title,
        body,
        category,
        area,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        max_participants: maxParticipants ? Number(maxParticipants) : null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        mode,
        status: 'open',
      });
      navigate(`/board/${post.id}`);
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? `募集の保存に失敗しました: ${caughtError.message}` : '募集の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell description="一緒にやりたいこと、話したいテーマ、探している仲間を投稿できます。" eyebrow="New Activity" title="募集を作成">
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/board"><ArrowLeft size={16} />募集ボードへ戻る</Link>

      {!canCreate ? (
        <Card className="space-y-2">
          <Badge>ローカルデモ</Badge>
          <p className="text-sm font-bold text-theme-text">ログインすると募集を投稿できます。</p>
          <p className="text-sm leading-6 text-theme-muted">Supabase未接続・未ログイン時は、デモ募集の一覧と詳細を見られます。</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="タイトル" maxLength={120} name="title" placeholder="AIアプリを一緒に作りたい" required value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>本文</span>
            <textarea className="theme-input min-h-36 w-full rounded-xl border px-3.5 py-3 text-sm outline-none" maxLength={2000} placeholder="どんな活動をしたいか、どんな仲間を探しているかを書いてください。" required value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-theme-text">
              <span>カテゴリ</span>
              <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" value={category} onChange={(event) => setCategory(event.target.value)}>
                {activityPostCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <Input label="活動エリア" name="area" placeholder="オンライン / 東京 / 関西など" value={area} onChange={(event) => setArea(event.target.value)} />
          </div>
          <Input helperText="カンマ区切りで入力してください。例: AI, 共創, 作業仲間" label="タグ" name="tags" placeholder="興味タグ" value={tags} onChange={(event) => setTags(event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="募集人数（任意）" min={1} name="max_participants" placeholder="3" type="number" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} />
            <Input label="開催予定日（任意）" name="scheduled_at" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          </div>
          <label className="space-y-2 text-sm font-semibold text-theme-text">
            <span>オンライン/オフライン</span>
            <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" value={mode} onChange={(event) => setMode(event.target.value as ActivityPostMode)}>
              {activityPostModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-theme-accent-soft/60 p-3 text-xs font-bold text-theme-muted">ステータスは open（募集中）で作成されます。</div>
          <Button className="w-full" disabled={!canCreate || saving} type="submit"><Plus size={16} />{saving ? '保存中...' : '募集を投稿する'}</Button>
        </form>
      </Card>
    </PageShell>
  );
}
