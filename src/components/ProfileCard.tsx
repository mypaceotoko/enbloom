import { Heart, Leaf, MapPin, MessageCircle, Sparkles, Sprout, Tags, UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../lib/utils';
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
  const { t } = useLanguage();
  const location = useLocation();
  const profileDetailState = { from: location.pathname, profilePreview: user };
  const [showMatch, setShowMatch] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [likeSaving, setLikeSaving] = useState(false);
  const previewBio = compact && user.bio.length > 48 ? `${user.bio.slice(0, 48)}…` : user.bio;
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
    <Card className={cn('group overflow-hidden p-0 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-theme-main/10', compact && 'shadow-sm')}>
      {showMatch ? (
        <div className="m-3 rounded-[1.15rem] border border-theme-accent/30 bg-theme-accent-soft/80 p-3 text-center shadow-sm">
          <p className="text-sm font-black text-theme-text">ご縁がつながりました</p>
          <p className="mt-1 text-xs font-bold text-theme-muted">{user.name}さんとコネクトしました。まずはゆっくり話してみましょう。</p>
        </div>
      ) : null}
      <Link aria-label={`${user.name}: ${t('profileCard.viewProfile')}`} className="block" state={profileDetailState} to={`/profile/${user.id}`}>
        <div className={cn('relative overflow-hidden bg-gradient-to-br', compact ? 'h-36' : 'h-48', user.gradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.85),transparent_28%),radial-gradient(circle_at_80%_74%,rgba(255,255,255,0.44),transparent_26%)]" />
          <div className="profile-card-hero-label absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-theme-main-dark shadow-lg shadow-theme-main/10 backdrop-blur">
            <Sparkles size={13} />
            {t('profileCard.today')}
          </div>
          <Badge className="profile-card-hero-badge absolute right-3 top-3 border border-white/70 bg-white/78 text-theme-text backdrop-blur">
            <UserRoundCheck size={13} />
            {matched ? t('profileCard.connected') : t('profileCard.introduction')}
          </Badge>
          <div className="absolute bottom-3 left-3 flex items-end gap-2.5">
            <ProfileAvatar className={cn('rounded-[1.35rem] border border-white/70 shadow-xl backdrop-blur', compact ? 'size-16' : 'size-20')} fallbackClassName={cn('bg-white/78 font-black', compact ? 'text-2xl' : 'text-3xl')} user={user} />
            <div className="profile-card-identity-panel mb-0.5 rounded-[1.1rem] bg-white/72 px-3 py-2 shadow-lg shadow-theme-main/10 backdrop-blur">
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

      <div className={cn('p-4', compact ? 'space-y-2.5' : 'space-y-3.5')}>
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <p className="flex items-center gap-1 text-[13px] font-black text-theme-main-dark">
              <Leaf size={14} />
              {user.occupation}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-theme-text">{previewBio}</p>
          </div>
          <Sprout className="mt-1 shrink-0 text-theme-main" size={compact ? 18 : 22} />
        </div>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-theme-main-dark">
            <Tags size={13} />
            {t('profileCard.sharedInterests')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {user.interests.slice(0, compact ? 3 : user.interests.length).map((interest) => (
              <Badge className="bg-theme-background/80" key={interest}>{interest}</Badge>
            ))}
          </div>
        </div>

        <div className="profile-card-info-panel grid gap-1.5 rounded-[1rem] border border-theme-main/10 bg-theme-background/70 p-2.5 text-[12px] leading-5">
          <div>
            <p className="flex items-center gap-1 font-black text-theme-text"><MessageCircle size={14} />{t('profileCard.connectionStyle')}</p>
            <p className="mt-0.5 text-theme-muted">{user.datingTemperature}</p>
          </div>
          <div className="profile-card-intro-label rounded-xl bg-theme-accent-soft/75 px-2.5 py-1 text-[11px] font-bold text-theme-text">
            {t('profileCard.introduction')}: {user.introducedBy}
          </div>
        </div>

        {likeError ? <p className="rounded-[1rem] bg-theme-accent-soft/70 px-3 py-2 text-xs font-bold text-theme-text">{likeError}</p> : null}

        <div className="flex gap-2 pt-0.5">
          {isCurrentUser ? null : (
            <Button className={`min-h-10 flex-1 whitespace-nowrap px-3 text-xs shadow-lg ${liked ? 'bg-gradient-to-r from-theme-cyan to-theme-main text-white shadow-theme-main/25 hover:saturate-125' : 'bg-theme-accent-soft text-theme-text'}`} disabled={likeSaving} onClick={handleLike} variant="secondary">
              <Heart fill={liked ? 'currentColor' : 'none'} size={15} />
              {liked ? t('profileCard.sent') : t('profileCard.like')}
            </Button>
          )}
          <Link className="flex-1" state={profileDetailState} to={`/profile/${user.id}`}>
            <Button className="min-h-10 w-full px-3 text-xs">{t('profileCard.viewProfile')}</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
