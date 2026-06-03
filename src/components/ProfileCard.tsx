import { Heart, Leaf, MapPin, MessageCircleHeart, Sparkles, Sprout, Tags, UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import type { UserProfile } from '../types/user';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { ProfileAvatar } from './ProfileAvatar';

export type ProfileCardProps = {
  user: UserProfile;
  compact?: boolean;
  liked?: boolean;
  matched?: boolean;
  isCurrentUser?: boolean;
  onToggleLike?: (userId: string, nextLiked: boolean) => Promise<boolean | void> | boolean | void;
};

export function ProfileCard({ user, compact = false, liked: likedOverride, matched: matchedOverride, isCurrentUser = false, onToggleLike }: ProfileCardProps) {
  const { isLiked, isMatched, toggleLike } = useAppState();
  const [showMatch, setShowMatch] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [likeSaving, setLikeSaving] = useState(false);
  const previewBio = compact && user.bio.length > 58 ? `${user.bio.slice(0, 58)}...` : user.bio;
  const liked = likedOverride ?? isLiked(user.id);
  const matched = matchedOverride ?? isMatched(user.id);

  async function handleLike() {
    if (isCurrentUser || likeSaving) return;

    setLikeError('');

    if (!onToggleLike) {
      const becameMatched = toggleLike(user.id);
      if (becameMatched) {
        setShowMatch(true);
      }
      return;
    }

    const nextLiked = !liked;
    setLikeSaving(true);

    try {
      const becameMatched = await onToggleLike(user.id, nextLiked);
      if (becameMatched) {
        setShowMatch(true);
      }
    } catch (caughtError) {
      setLikeError(caughtError instanceof Error ? caughtError.message : '通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setLikeSaving(false);
    }
  }

  return (
    <Card className="group overflow-hidden p-0 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-theme-main/10">
      {showMatch ? (
        <div className="m-3 rounded-[1.15rem] border border-theme-accent/30 bg-theme-accent-soft/80 p-3 text-center shadow-sm">
          <p className="text-sm font-black text-theme-text">ご縁がつながりました</p>
          <p className="mt-1 text-xs font-bold text-theme-muted">{user.name}さんとコネクトしました。まずはゆっくり話してみましょう。</p>
        </div>
      ) : null}
      <Link aria-label={`${user.name}さんの詳細を見る`} className="block" to={`/profile/${user.id}`}>
        <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${user.gradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.85),transparent_28%),radial-gradient(circle_at_80%_74%,rgba(255,255,255,0.44),transparent_26%)]" />
          <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-theme-main-dark shadow-lg shadow-theme-main/10 backdrop-blur">
            <Sparkles size={13} />
            今日のつながり
          </div>
          <Badge className="absolute right-3.5 top-3.5 border border-white/70 bg-white/78 text-theme-text backdrop-blur">
            <UserRoundCheck size={13} />
            {matched ? 'コネクト済み' : '紹介経由'}
          </Badge>
          <div className="absolute bottom-3.5 left-3.5 flex items-end gap-2.5">
            <ProfileAvatar className="size-20 rounded-[1.45rem] border border-white/70 shadow-xl backdrop-blur" fallbackClassName="bg-white/78 text-3xl font-black" user={user} />
            <div className="mb-0.5 rounded-[1.25rem] bg-white/72 px-3.5 py-2.5 shadow-lg shadow-theme-main/10 backdrop-blur">
              <p className="text-base font-black leading-none text-theme-text">
                {user.name} <span className="text-xs font-bold text-theme-muted">{user.age}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-theme-muted">
                <MapPin size={13} />
                {user.location}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-3.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-[13px] font-black text-theme-main-dark">
              <Leaf size={14} />
              {user.occupation}
            </p>
            <p className="mt-1.5 text-[13px] leading-5 text-theme-text">{previewBio}</p>
          </div>
          <Sprout className="mt-1 shrink-0 text-theme-main" size={22} />
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-theme-main-dark">
            <Tags size={13} />
            活動ジャンル / 共通点
          </p>
          <div className="flex flex-wrap gap-1.5">
            {user.interests.slice(0, compact ? 3 : user.interests.length).map((interest) => (
              <Badge className="bg-theme-background/80" key={interest}>{interest}</Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-2.5 rounded-[1.15rem] border border-theme-main/10 bg-theme-background/70 p-3 text-[13px] leading-5">
          <div>
            <p className="flex items-center gap-1 font-black text-theme-text"><MessageCircleHeart size={14} />つながり方</p>
            <p className="mt-1 text-theme-muted">{user.datingTemperature}</p>
          </div>
          <div className="rounded-xl bg-theme-accent-soft/75 px-2.5 py-1.5 text-[11px] font-bold text-theme-text">
            紹介ルート: {user.introducedBy}
          </div>
        </div>

        {likeError ? <p className="rounded-[1rem] bg-theme-accent-soft/70 px-3 py-2 text-xs font-bold text-theme-text">{likeError}</p> : null}

        <div className="flex gap-2 pt-0.5">
          {isCurrentUser ? null : (
            <Button className={`flex-1 shadow-lg ${liked ? 'bg-gradient-to-r from-theme-cyan to-theme-main text-white shadow-theme-main/25 hover:saturate-125' : 'bg-theme-accent-soft text-theme-text'}`} disabled={likeSaving} onClick={handleLike} variant="secondary">
              <Heart fill={liked ? 'currentColor' : 'none'} size={16} />
              {liked ? '話してみたい済み' : '話してみたい'}
            </Button>
          )}
          <Link className="flex-1" to={`/profile/${user.id}`}>
            <Button className="w-full">詳細を見る</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
