import { Heart, Leaf, MapPin, MessageCircleHeart, Sparkles, Sprout, UserRoundCheck } from 'lucide-react';
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
  const previewBio = compact && user.bio.length > 58 ? `${user.bio.slice(0, 58)}...` : user.bio;

  return (
    <Card className="group overflow-hidden p-0 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-theme-main/10">
      <Link aria-label={`${user.name}さんの詳細を見る`} className="block" to={`/profile/${user.id}`}>
        <div className={`relative h-52 overflow-hidden bg-gradient-to-br ${user.gradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.85),transparent_28%),radial-gradient(circle_at_80%_74%,rgba(255,255,255,0.44),transparent_26%)]" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-theme-main-dark shadow-lg shadow-theme-main/10 backdrop-blur">
            <Sparkles size={13} />
            今日のご縁
          </div>
          <Badge className="absolute right-4 top-4 border border-white/70 bg-white/78 text-theme-text backdrop-blur">
            <UserRoundCheck size={13} />
            紹介経由
          </Badge>
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            <div className="flex size-24 items-center justify-center rounded-[2rem] border border-white/70 bg-white/78 text-4xl font-black text-theme-main-dark shadow-xl backdrop-blur">
              {user.name.slice(0, 1)}
            </div>
            <div className="mb-1 rounded-3xl bg-white/72 px-4 py-3 shadow-lg shadow-theme-main/10 backdrop-blur">
              <p className="text-lg font-black leading-none text-theme-text">
                {user.name} <span className="text-sm font-bold text-theme-muted">{user.age}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-theme-muted">
                <MapPin size={13} />
                {user.location}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-sm font-black text-theme-main-dark">
              <Leaf size={16} />
              {user.occupation}
            </p>
            <p className="mt-2 text-sm leading-6 text-theme-text">{previewBio}</p>
          </div>
          <Sprout className="mt-1 shrink-0 text-theme-main" size={26} />
        </div>

        <div className="flex flex-wrap gap-2">
          {user.interests.slice(0, compact ? 3 : user.interests.length).map((interest) => (
            <Badge className="bg-theme-background/80" key={interest}>{interest}</Badge>
          ))}
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-theme-main/10 bg-theme-background/70 p-4 text-sm leading-6">
          <div>
            <p className="flex items-center gap-1 font-black text-theme-text"><MessageCircleHeart size={15} />出会いの温度感</p>
            <p className="mt-1 text-theme-muted">{user.datingTemperature}</p>
          </div>
          <div className="rounded-2xl bg-theme-accent-soft/75 px-3 py-2 text-xs font-bold text-theme-text">
            {user.introducedBy} からの紹介で安心
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 bg-theme-accent text-white shadow-lg shadow-theme-accent/25 hover:bg-theme-accent/90" variant="secondary">
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
