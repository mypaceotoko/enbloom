import { KeyRound, ShieldAlert, UsersRound } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const adminCards = [
  { icon: KeyRound, title: '招待コード管理', count: '12件', body: '発行・利用状況・期限管理の土台です。' },
  { icon: UsersRound, title: 'ユーザー管理', count: '48人', body: 'プロフィール確認とステータス管理のプレースホルダーです。' },
  { icon: ShieldAlert, title: '通報管理', count: '3件', body: '通報内容の確認・対応履歴を扱う想定です。' },
];

export function AdminPage() {
  return (
    <PageShell description="運営向け管理画面の土台です。認可・DB接続は未実装です。" eyebrow="Admin" title="管理画面">
      {adminCards.map((item) => {
        const Icon = item.icon;
        return <Card className="space-y-3" key={item.title}><div className="flex items-center justify-between"><span className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark"><Icon size={22} /></span><span className="font-black">{item.title}</span></span><Badge>{item.count}</Badge></div><p className="text-sm leading-6 text-theme-muted">{item.body}</p></Card>;
      })}
    </PageShell>
  );
}
