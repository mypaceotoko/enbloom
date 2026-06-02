import type { ReactNode } from 'react';
import { Bell, Languages, UserRoundCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function SettingsPage() {
  return (
    <PageShell description="テーマ設定のみlocalStorageへ保存します。他は将来実装のプレースホルダーです。" eyebrow="Settings" title="設定">
      <Card className="space-y-4">
        <h2 className="font-black">テーマカラー</h2>
        <ThemeSwitcher />
      </Card>
      <Placeholder icon={<Languages size={20} />} title="言語設定" body="日本語 / 英語切り替えは将来実装予定です。" />
      <Placeholder icon={<Bell size={20} />} title="通知設定" body="マッチ・メッセージ通知の設定を次フェーズ以降に追加します。" />
      <Placeholder icon={<UserRoundCheck size={20} />} title="紹介者表示設定" body="紹介者名の表示範囲をユーザー設定として保存できるようにします。" />
    </PageShell>
  );
}

function Placeholder({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <Card className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">{icon}</span><span><span className="block font-black">{title}</span><span className="mt-1 block text-sm leading-6 text-theme-muted">{body}</span></span></Card>;
}
