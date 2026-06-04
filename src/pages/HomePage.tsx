import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Bell, CalendarHeart, CheckCircle2, ClipboardList, DoorOpen, Flower2, HeartHandshake, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ProfileCard } from '../components/ProfileCard';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getSafetyHiddenUserIds } from '../lib/blockApi';
import { createLike, deleteLike, getLikedUserIds } from '../lib/likeApi';
import { getMatchedUserIds } from '../lib/matchApi';
import { safeGetUnreadNotificationCount } from '../lib/notificationApi';
import { attachPrimaryPhotoUrls, getPrimaryProfilePhotos } from '../lib/profilePhotoApi';
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
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const location = useLocation();
  const homeState = location.state as { profileSaved?: boolean; message?: string } | null;
  const profileSaved = Boolean(homeState?.profileSaved);
  const profileSavedMessage = homeState?.message ?? 'プロフィールを保存しました。今日のつながりを見てみましょう。';
  const useSupabaseLikes = isSupabaseMode && isAuthenticated && Boolean(user);
  const sourceUsers = useSupabaseLikes ? supabaseUsers : mockUsers;
  const safetyHiddenIds = useSupabaseLikes ? hiddenUserIds : blockedUserIds;
  const todaysUsers = sourceUsers.filter((profile) => !safetyHiddenIds.includes(profile.id)).slice(0, 3);

  useEffect(() => {
    let mounted = true;

    async function loadUnreadNotificationCount() {
      if (!useSupabaseLikes) {
        setUnreadNotificationCount(0);
        return;
      }

      try {
        const count = await safeGetUnreadNotificationCount();
        if (mounted) setUnreadNotificationCount(count);
      } catch (caughtError) {
        console.warn('[ConnectBloom] notification count fetch failed', { error: caughtError });
        if (mounted) setUnreadNotificationCount(0);
      }
    }

    void loadUnreadNotificationCount();

    return () => {
      mounted = false;
    };
  }, [useSupabaseLikes]);

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

        const usersWithFallbacks = profiles.map((profile) => profileRowToUserProfile(profile));
        const photosByUserId = await getPrimaryProfilePhotos(usersWithFallbacks.map((profile) => profile.id));

        if (!mounted) return;
        setSupabaseUsers(attachPrimaryPhotoUrls(usersWithFallbacks, photosByUserId));
        setLikedUserIds(likedIds);
        setMatchedUserIds(matchedIds);
        setHiddenUserIds(nextHiddenUserIds);
      } catch (caughtError) {
        if (!mounted) return;
        setSupabaseUsers([]);
        setLikedUserIds([]);
        setMatchedUserIds([]);
        setHiddenUserIds([]);
        setNotice(caughtError instanceof Error ? `話してみたい状態の取得に失敗しました: ${caughtError.message}` : '話してみたい状態の取得に失敗しました。');
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
      throw new Error(nextLiked ? '話してみたいの保存に失敗しました。' : '話してみたいの取り消しに失敗しました。', { cause: caughtError });
    }
  }

  return (
    <PageShell description="共通の興味や紹介から、話してみたい人を見つけましょう。今日は3人だけ、丁寧につながる設計です。" eyebrow="Home" title="今日のつながり">
      {profileSaved ? (
        <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} />{profileSavedMessage}</span>
        </div>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      {unreadNotificationCount > 0 ? (
        <Card className="flex items-center gap-3 border-theme-main/15 bg-cyan-50/80 py-3 shadow-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-theme-main text-white"><Bell size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-theme-text">未読通知があります</span>
            <span className="block text-xs leading-5 text-theme-muted">参加希望・承認・DMの新着 {unreadNotificationCount}件を確認できます。</span>
          </span>
          <Link to="/notifications"><Button className="min-h-9 px-3 text-xs" variant="secondary">通知を見る</Button></Link>
        </Card>
      ) : null}

      <Card className="flower-gradient relative overflow-hidden border-0 p-1">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/30" />
        <div className="absolute -bottom-10 left-8 size-24 rounded-full bg-theme-accent-soft/50 blur-2xl" />
        <div className="relative space-y-3 rounded-[1.25rem] bg-theme-card/78 p-4 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-theme-main text-white"><Sparkles size={13} />次にすること</Badge>
            <Badge className="bg-theme-card/80"><ShieldCheck size={13} />紹介制コネクトSNS</Badge>
          </div>
          <div>
            <h2 className="text-[1.25rem] font-black leading-tight tracking-[-0.03em]">次にすること</h2>
            <p className="mt-2 text-[13px] leading-6 text-theme-muted">
              ルームで話す、募集を探す、参加希望を確認する。今の動きに合わせて進めます。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link to="/board"><Button className="w-full min-h-11 text-sm">募集を探す</Button></Link>
            <Link to="/rooms"><Button className="w-full min-h-11 text-sm" variant="secondary">ルームに入る</Button></Link>
            <Link to="/my-activity"><Button className="w-full min-h-11 text-sm" variant="secondary">活動を確認</Button></Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-theme-text">
            <span className="rounded-xl bg-theme-background/80 p-2.5"><Flower2 className="mx-auto mb-1 text-theme-main" size={16} />自然体</span>
            <span className="rounded-xl bg-theme-background/80 p-2.5"><HeartHandshake className="mx-auto mb-1 text-theme-main" size={16} />会話</span>
            <span className="rounded-xl bg-theme-background/80 p-2.5"><UsersRound className="mx-auto mb-1 text-theme-main" size={16} />紹介経由</span>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 border-theme-main/15 bg-theme-card/86 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-black text-theme-text">最近の動き</span>
            <span className="mt-1 block text-xs leading-5 text-theme-muted">通知・活動・募集ボード・ルームをすぐ確認できます。</span>
          </span>
          {unreadNotificationCount > 0 ? <span className="rounded-full bg-theme-main/10 px-2.5 py-1 text-[11px] font-black text-theme-main-dark">未読 {unreadNotificationCount}件</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <HomeQuickLink icon={<Bell size={16} />} label="通知を見る" path="/notifications" />
          <HomeQuickLink icon={<Sparkles size={16} />} label="マイアクティビティ" path="/my-activity" />
          <HomeQuickLink icon={<ClipboardList size={16} />} label="募集ボードを見る" path="/board" />
          <HomeQuickLink icon={<DoorOpen size={16} />} label="ルームを見る" path="/rooms" />
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-full bg-theme-card/70 px-3.5 py-2.5 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5 text-[13px] font-black text-theme-main-dark">
          <CalendarHeart size={16} />
          今日の紹介 {todaysUsers.length}人
        </span>
        <span className="text-xs font-bold text-theme-muted">{loadingLikes ? '話してみたい取得中' : '毎朝 7:00 更新'}</span>
      </div>

      <div className="space-y-4">
        {todaysUsers.map((profile) => (
          <ProfileCard compact isCurrentUser={profile.id === user?.id} key={profile.id} liked={useSupabaseLikes ? likedUserIds.includes(profile.id) : undefined} matched={useSupabaseLikes ? matchedUserIds.includes(profile.id) : undefined} onToggleLike={useSupabaseLikes ? handleSupabaseLike : undefined} user={profile} />
        ))}
      </div>
    </PageShell>
  );
}
function HomeQuickLink({ icon, label, path }: { icon: ReactNode; label: string; path: string }) {
  return (
    <Link className="flex items-center gap-2 rounded-2xl bg-theme-accent-soft/55 px-3 py-2 text-xs font-black text-theme-main-dark transition hover:bg-theme-accent-soft active:scale-[0.98]" to={path}>
      {icon}
      {label}
    </Link>
  );
}
