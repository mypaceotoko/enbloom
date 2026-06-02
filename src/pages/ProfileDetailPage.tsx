import type { ReactNode } from 'react';
import { Ban, Flag, Heart, Leaf, MapPin, MessageCircleHeart, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';

export function ProfileDetailPage() {
  const { id } = useParams();
  const user = mockUsers.find((mockUser) => mockUser.id === id);

  if (!user) {
    return <Navigate replace to="/discover" />;
  }

  return (
    <PageShell eyebrow="Profile" title={`${user.name}さんを知る`}>
      <Card className="overflow-hidden p-0">
        <div className={`relative h-80 overflow-hidden bg-gradient-to-br ${user.gradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.86),transparent_28%),radial-gradient(circle_at_78%_76%,rgba(255,255,255,0.45),transparent_25%)]" />
          <Badge className="absolute left-5 top-5 border border-white/70 bg-white/75 backdrop-blur"><Sparkles size={13} />今日のご縁</Badge>
          <div className="absolute bottom-5 left-5 right-5 rounded-[2rem] bg-theme-card/78 p-4 shadow-xl shadow-theme-main/10 backdrop-blur">
            <div className="flex items-end gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-[2rem] border border-white/80 bg-white/70 text-4xl font-black text-theme-main-dark shadow-lg">
                {user.name.slice(0, 1)}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-3xl font-black leading-none text-theme-text">{user.name} <span className="text-lg text-theme-muted">{user.age}</span></h1>
                <p className="mt-2 flex items-center gap-1 text-sm font-bold text-theme-muted"><MapPin size={16} />{user.location}</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-bold text-theme-main-dark"><Leaf size={15} />{user.occupation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge><UserRoundCheck size={13} />{user.introducedBy} からの紹介</Badge>
            <Badge className="bg-theme-background"><ShieldCheck size={13} />安心して進める</Badge>
          </div>

          <p className="rounded-[1.5rem] bg-theme-background/70 p-4 leading-7 text-theme-text">{user.bio}</p>

          <div className="space-y-2">
            <p className="font-black">趣味・共通点のきっかけ</p>
            <div className="flex flex-wrap gap-2">{user.interests.map((interest) => <Badge className="bg-theme-accent-soft/80" key={interest}>{interest}</Badge>)}</div>
          </div>

          <InfoBlock icon={<MessageCircleHeart size={17} />} title="出会いの温度感" body={user.datingTemperature} />
          <InfoBlock icon={<Heart size={17} />} title="関係性の希望" body={user.relationshipGoal} />

          <div className="sticky bottom-24 z-10 space-y-2 rounded-[1.75rem] border border-white/60 bg-theme-card/88 p-3 shadow-2xl shadow-theme-main/15 backdrop-blur">
            <Button className="w-full bg-theme-accent text-white shadow-theme-accent/25 hover:bg-theme-accent/90"><Heart size={18} />いいねを送る</Button>
            <p className="text-center text-xs font-bold text-theme-muted">いいねはデモ用です。DB保存・通知送信はまだ行いません。</p>
          </div>

          <Card className="space-y-3 bg-theme-background/65 p-4 shadow-none">
            <div className="flex items-center gap-2 text-sm font-black text-theme-text"><ShieldCheck size={17} />安全のための操作</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost"><Ban size={16} />ブロック</Button>
              <Button variant="danger"><Flag size={16} />通報</Button>
            </div>
          </Card>
        </div>
      </Card>
    </PageShell>
  );
}

function InfoBlock({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-theme-main/10 bg-theme-accent-soft/65 p-4">
      <p className="flex items-center gap-2 font-black text-theme-text">{icon}{title}</p>
      <p className="mt-2 text-sm leading-6 text-theme-muted">{body}</p>
    </div>
  );
}
