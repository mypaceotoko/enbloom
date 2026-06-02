import { Ban, Flag, Heart, MapPin, UserRoundCheck } from 'lucide-react';
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
    <PageShell eyebrow="Profile" title={`${user.name}さんのプロフィール`}>
      <Card className="overflow-hidden p-0">
        <div className={`relative h-72 bg-gradient-to-br ${user.gradient}`}>
          <div className="absolute bottom-5 left-5 flex size-24 items-center justify-center rounded-[2rem] bg-white/80 text-4xl font-black text-theme-main-dark shadow-xl backdrop-blur">{user.name.slice(0, 1)}</div>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <h1 className="text-3xl font-black">{user.name} <span className="text-xl text-theme-muted">{user.age}</span></h1>
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-theme-muted"><MapPin size={16} />{user.location} ・ {user.occupation}</p>
          </div>
          <Badge><UserRoundCheck size={13} />{user.introducedBy} からの紹介</Badge>
          <p className="leading-7 text-theme-text">{user.bio}</p>
          <div className="space-y-2">
            <p className="font-black">趣味</p>
            <div className="flex flex-wrap gap-2">{user.interests.map((interest) => <Badge key={interest}>{interest}</Badge>)}</div>
          </div>
          <InfoBlock title="出会いの温度感" body={user.datingTemperature} />
          <InfoBlock title="関係性の希望" body={user.relationshipGoal} />
          <Button className="w-full"><Heart size={18} />いいねを送る</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost"><Ban size={16} />ブロック</Button>
            <Button variant="danger"><Flag size={16} />通報</Button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-theme-accent-soft/70 p-4">
      <p className="font-black text-theme-text">{title}</p>
      <p className="mt-1 text-sm leading-6 text-theme-muted">{body}</p>
    </div>
  );
}
