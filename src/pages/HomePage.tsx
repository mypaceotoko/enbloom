import { useEffect, useState } from 'react';
import { CalendarHeart, CheckCircle2, Flower2, HeartHandshake, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ProfileCard } from '../components/ProfileCard';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getSafetyHiddenUserIds } from '../lib/blockApi';
import { createLike, deleteLike, getLikedUserIds } from '../lib/likeApi';
import { getMatchedUserIds } from '../lib/matchApi';
import { getPublicProfiles, profileRowToUserProfile } from '../lib/profileApi';
import type { UserProfile } from '../types/user';

export function HomePage() {
  const { blockedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [supabaseUsers, setSupabaseUsers] = useState<UserProfile[]>([]);
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<string[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [loadingLikes, setLoadingLikes] = useState(false);
  const location = useLocation();
  const homeState = location.state as { profileSaved?: boolean; message?: string } | null;
  const profileSaved = Boolean(homeState?.profileSaved);
  const profileSavedMessage = homeState?.message ?? 'プロフィールを保存しました。今日のご縁を見てみましょう。';
  const useSupabaseLikes = isSupabaseMode && isAuthenticated && Boolean(user);
  const sourceUsers = useSupabaseLikes ? supabaseUsers : mockUsers;
  const safetyHiddenIds = useSupabaseLikes ? hiddenUserIds : blockedUserIds;
  const todaysUsers = sourceUsers.filter((profile) => !safetyHiddenIds.includes(profile.id)).slice(0, 3);

  useEffect(() => {
    let mounted = true;

    async function loadSupabaseLikes() {
      if (!useSupabaseLikes || !user) {
        setSupabaseUsers([]);
        setLikedUserIds([]);
        setMatchedUserIds([]);
        setHiddenUserIds([]);
        setNotice('');
        return;
      }

      setLoadingLikes(true);
      setNotice('');

      try {
        const [profiles, likedIds, matchedIds, nextHiddenUserIds] = await Promise.all([
          getPublicProfiles(user.id, 12),
          getLikedUserIds(user.id),
          getMatchedUserIds(user.id),
          getSafetyHiddenUserIds(user.id),
        ]);

        if (!mounted) return;
        setSupabaseUsers(profiles.map(profileRowToUserProfile));
        setLikedUserIds(likedIds);
        setMatchedUserIds(matchedIds);
        setHiddenUserIds(nextHiddenUserIds);
      } catch (caughtError) {
        if (!mounted) return;
        setSupabaseUsers([]);
        setLikedUserIds([]);
        setMatchedUserIds([]);
        setHiddenUserIds([]);
        setNotice(caughtError instanceof Error ? `いいね状態の取得に失敗しました: ${caughtError.message}` : 'いいね状態の取得に失敗しました。');
      } finally {
        if (mounted) setLoadingLikes(false);
      }
    }

    void loadSupabaseLikes();

    return () => {
      mounted = false;
    };
  }, [useSupabaseLikes, user]);

  async function handleSupabaseLike(profileId: string, nextLiked: boolean) {
    if (!useSupabaseLikes) return false;

    try {
      if (nextLiked) {
        const likeResult = await createLike(profileId);
        setLikedUserIds((current) => current.includes(profileId) ? current : [...current, profileId]);
        if (likeResult.matched) {
          setMatchedUserIds((current) => current.includes(profileId) ? current : [...current, profileId]);
        }
        if (likeResult.matchCheckError) {
          setNotice(likeResult.matchCheckError);
        }
        return likeResult.matched;
      }

      await deleteLike(profileId);
      setLikedUserIds((current) => current.filter((id) => id !== profileId));
      return false;
    } catch (caughtError) {
      throw new Error(nextLiked ? 'いいねの保存に失敗しました。' : 'いいねの取り消しに失敗しました。', { cause: caughtError });
    }
  }

  return (
    <PageShell description="ログイン後のホームでは、大量に選ぶのではなく、今日向き合いやすい少人数のご縁だけを丁寧に紹介します。" eyebrow="Home" title="今日のご縁">
      {profileSaved ? (
        <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} />{profileSavedMessage}</span>
        </div>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      <Card className="flower-gradient relative overflow-hidden border-0 p-1">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/30" />
        <div className="absolute -bottom-10 left-8 size-24 rounded-full bg-theme-accent-soft/50 blur-2xl" />
        <div className="relative rounded-[1.25rem] bg-theme-card/78 p-4 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-theme-main text-white"><Sparkles size={13} />{useSupabaseLikes ? 'Supabase Likes' : 'Phase 2 Local Demo'}</Badge>
            <Badge className="bg-theme-card/80"><ShieldCheck size={13} />ログイン後ホーム</Badge>
          </div>
          <h2 className="mt-3 text-[1.35rem] font-black leading-tight tracking-[-0.03em]">1日数人だけ。<br />花束のように届く、今日の出会い。</h2>
          <p className="mt-2.5 text-[13px] leading-6 text-theme-muted">
            紹介経由の安心感、共通点、出会いの温度感が伝わるように、プロフィールをゆっくり読める体験にしています。
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-theme-text">
            <span className="rounded-xl bg-theme-background/80 p-2.5"><Flower2 className="mx-auto mb-1 text-theme-main" size={16} />自然体</span>
            <span className="rounded-xl bg-theme-background/80 p-2.5"><HeartHandshake className="mx-auto mb-1 text-theme-main" size={16} />温度感</span>
            <span className="rounded-xl bg-theme-background/80 p-2.5"><UsersRound className="mx-auto mb-1 text-theme-main" size={16} />紹介経由</span>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-full bg-theme-card/70 px-3.5 py-2.5 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5 text-[13px] font-black text-theme-main-dark">
          <CalendarHeart size={16} />
          今日の紹介 {todaysUsers.length}人
        </span>
        <span className="text-xs font-bold text-theme-muted">{loadingLikes ? 'いいね取得中' : '毎朝 7:00 更新'}</span>
      </div>

      <div className="space-y-4">
        {todaysUsers.map((profile) => (
          <ProfileCard compact isCurrentUser={profile.id === user?.id} key={profile.id} liked={useSupabaseLikes ? likedUserIds.includes(profile.id) : undefined} matched={useSupabaseLikes ? matchedUserIds.includes(profile.id) : undefined} onToggleLike={useSupabaseLikes ? handleSupabaseLike : undefined} user={profile} />
        ))}
      </div>
    </PageShell>
  );
}
