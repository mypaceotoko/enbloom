import { CalendarHeart, Flower2, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ProfileCard } from '../components/ProfileCard';
import { mockUsers } from '../data/mockUsers';

export function HomePage() {
  const todaysUsers = mockUsers.slice(0, 4);

  return (
    <PageShell description="大量に選ぶのではなく、今日向き合いやすい少人数のご縁を丁寧に紹介します。" eyebrow="Today" title="今日のご縁">
      <Card className="flower-gradient relative overflow-hidden border-0 p-1">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/30" />
        <div className="relative rounded-[1.6rem] bg-theme-card/78 p-5 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-theme-main text-white"><Sparkles size={13} />Phase 1.5 UI Demo</Badge>
            <Badge className="bg-theme-card/80"><ShieldCheck size={13} />紹介制・信頼ベース</Badge>
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.03em]">1日数人だけ。<br />花束のように届く、今日の出会い。</h2>
          <p className="mt-3 text-sm leading-7 text-theme-muted">
            共通点、紹介者、出会いの温度感が伝わるように、プロフィールをゆっくり読めるホームにしました。
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-theme-text">
            <span className="rounded-2xl bg-theme-background/80 p-3"><Flower2 className="mx-auto mb-1 text-theme-main" size={18} />自然体</span>
            <span className="rounded-2xl bg-theme-background/80 p-3"><HeartHandshake className="mx-auto mb-1 text-theme-main" size={18} />温度感</span>
            <span className="rounded-2xl bg-theme-background/80 p-3"><ShieldCheck className="mx-auto mb-1 text-theme-main" size={18} />安心感</span>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-full bg-theme-card/70 px-4 py-3 shadow-sm backdrop-blur">
        <span className="flex items-center gap-2 text-sm font-black text-theme-main-dark">
          <CalendarHeart size={18} />
          今日のおすすめ {todaysUsers.length}人
        </span>
        <span className="text-xs font-bold text-theme-muted">更新 7:00</span>
      </div>

      <div className="space-y-5">
        {todaysUsers.map((user) => <ProfileCard compact key={user.id} user={user} />)}
      </div>
    </PageShell>
  );
}
