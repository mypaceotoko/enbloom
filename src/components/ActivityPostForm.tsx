import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { Input } from './Input';
import { activityPostCategories, activityPostModes } from '../data/mockActivityPosts';
import type { ActivityPostEditFormState, ActivityPostMode, ActivityPostStatus } from '../types/activityBoard';

type ActivityPostFormProps = {
  form: ActivityPostEditFormState;
  saving: boolean;
  submitLabel: string;
  cancelTo: string;
  showStatus?: boolean;
  statusOptions?: ActivityPostStatus[];
  onChange: (nextForm: ActivityPostEditFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function getStatusLabel(status: ActivityPostStatus) {
  if (status === 'closed') return '締切済み';
  if (status === 'archived') return 'アーカイブ';
  return '募集中';
}


export function ActivityPostForm({
  cancelTo,
  form,
  onChange,
  onSubmit,
  saving,
  showStatus = false,
  statusOptions = ['open', 'closed'],
  submitLabel,
}: ActivityPostFormProps) {
  const updateField = <Field extends keyof ActivityPostEditFormState>(field: Field, value: ActivityPostEditFormState[Field]) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Input label="一緒にやりたいこと" maxLength={120} name="title" placeholder="AIアプリを一緒に作りたい" required value={form.title} onChange={(event) => updateField('title', event.target.value)} />
      <label className="block space-y-2 text-sm font-semibold text-theme-text">
        <span>探している仲間</span>
        <textarea className="theme-input min-h-36 w-full rounded-xl border px-3.5 py-3 text-sm outline-none" maxLength={2000} placeholder="どんな活動をしたいか、どんな仲間を探しているかを書いてください。" required value={form.body} onChange={(event) => updateField('body', event.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-theme-text">
          <span>活動ジャンル</span>
          <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" required value={form.category} onChange={(event) => updateField('category', event.target.value)}>
            {activityPostCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Input label="活動エリア" name="location" placeholder="オンライン / 東京 / 関西など" value={form.location} onChange={(event) => updateField('location', event.target.value)} />
      </div>
      <Input helperText="カンマ区切り、または読点区切りで入力できます。例: AI, 共創、作業仲間" label="興味タグ" name="tags" placeholder="興味タグ" value={form.tags} onChange={(event) => updateField('tags', event.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="募集人数（任意）" min={1} name="capacity" placeholder="3" type="number" value={form.capacity} onChange={(event) => updateField('capacity', event.target.value)} />
        <Input label="開催予定日（任意）" name="scheduled_at" type="datetime-local" value={form.scheduledAt} onChange={(event) => updateField('scheduledAt', event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-theme-text">
          <span>オンライン/オフライン</span>
          <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" value={form.mode} onChange={(event) => updateField('mode', event.target.value as ActivityPostMode)}>
            {activityPostModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {showStatus ? (
          <label className="space-y-2 text-sm font-semibold text-theme-text">
            <span>ステータス</span>
            <select className="theme-input min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none" value={form.status} onChange={(event) => updateField('status', event.target.value as ActivityPostStatus)}>
              {statusOptions.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/60 pt-4">
        <Button disabled={saving} type="submit">{submitLabel}</Button>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-theme-accent-soft px-4 py-2 text-[13px] font-bold text-theme-text" to={cancelTo}>キャンセル</Link>
      </div>
    </form>
  );
}
