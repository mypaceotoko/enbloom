import { CalendarHeart, Sparkles } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ProfileCard } from '../components/ProfileCard';
import { mockUsers } from '../data/mockUsers';

export function HomePage() {
  return (
    <PageShell description="一度にたくさんではなく、今日向き合いやすい少人数のご縁を表示します。" eyebrow="Today" title="今日のご縁">
      <Card className="flower-gradient border-0">
        <div className="rounded-[1.4rem] bg-white/75 p-4 backdrop-blur">
          <Badge className="bg-theme-main text-white"><Sparkles size={13} />Phase 1 Demo</Badge>
          <h2 className="mt-3 text-xl font-black">紹介から広がる、あたたかい出会い</h2>
          <p className="mt-2 text-sm leading-6 text-theme-muted">いいねや詳細画面への導線はUI確認用です。Supabase接続は次フェーズで行います。</p>
        </div>
      </Card>
      <div className="flex items-center gap-2 text-sm font-bold text-theme-main-dark">
        <CalendarHeart size={18} />
        今日のおすすめ {mockUsers.slice(0, 4).length}人
      </div>
      <div className="space-y-5">
        {mockUsers.slice(0, 4).map((user) => <ProfileCard compact key={user.id} user={user} />)}
      </div>
    </PageShell>
  );
}
