import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';

export function MatchesPage() {
  return (
    <PageShell description="マッチ一覧とメッセージ導線のプレースホルダーです。" eyebrow="Matches" title="マッチ">
      <Card className="space-y-3">
        {mockUsers.slice(0, 3).map((user) => (
          <div className="flex items-center gap-3 rounded-3xl bg-theme-accent-soft/45 p-3" key={user.id}>
            <span className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${user.gradient} text-xl font-black text-theme-main-dark`}>{user.name.slice(0, 1)}</span>
            <span className="min-w-0 flex-1"><span className="block font-black">{user.name}</span><span className="block text-xs leading-5 text-theme-muted">紹介のご縁からマッチしました</span></span>
            <Link to={`/messages/${user.id}`}><Button className="min-h-10 px-3 py-2"><MessageCircle size={16} /></Button></Link>
          </div>
        ))}
      </Card>
    </PageShell>
  );
}
