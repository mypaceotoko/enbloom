import { Heart, MapPin, Sprout, UserRoundCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MockUser } from '../data/mockUsers';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

type ProfileCardProps = {
  user: MockUser;
  compact?: boolean;
};

export function ProfileCard({ user, compact = false }: ProfileCardProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className={`relative h-48 bg-gradient-to-br ${user.gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),transparent_30%)]" />
        <div className="absolute bottom-4 left-4 flex size-20 items-center justify-center rounded-[2rem] bg-white/80 text-3xl font-black text-theme-main-dark shadow-xl backdrop-blur">
          {user.name.slice(0, 1)}
        </div>
        <Badge className="absolute right-4 top-4 bg-white/80 backdrop-blur">
          <UserRoundCheck size={13} />
          紹介経由
        </Badge>
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-theme-text">
                {user.name} <span className="text-base font-bold text-theme-muted">{user.age}</span>
              </h2>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-theme-muted">
                <MapPin size={15} />
                {user.location} ・ {user.occupation}
              </p>
            </div>
            <Sprout className="text-theme-main" size={26} />
          </div>
          <p className="text-sm leading-6 text-theme-text">{compact ? `${user.bio.slice(0, 52)}...` : user.bio}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.interests.slice(0, compact ? 3 : user.interests.length).map((interest) => (
            <Badge key={interest}>{interest}</Badge>
          ))}
        </div>
        <div className="rounded-3xl bg-theme-accent-soft/70 p-4 text-sm leading-6">
          <p className="font-bold text-theme-text">出会いの温度感</p>
          <p className="text-theme-muted">{user.datingTemperature}</p>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="secondary">
            <Heart size={18} />
            いいね
          </Button>
          <Link className="flex-1" to={`/profile/${user.id}`}>
            <Button className="w-full">詳しく見る</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
