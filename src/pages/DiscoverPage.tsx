import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
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

const filters = ['紹介経由', 'カフェ', '旅行', 'ゆっくり話したい', '東京近郊'];

export function DiscoverPage() {
  const { blockedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [supabaseUsers, setSupabaseUsers] = useState<UserProfile[]>([]);
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<string[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const useSupabaseLikes = isSupabaseMode && isAuthenticated && Boolean(user);
  const sourceUsers = useSupabaseLikes ? supabaseUsers : mockUsers;
  const safetyHiddenIds = useSupabaseLikes ? hiddenUserIds : blockedUserIds;
  const visibleUsers = sourceUsers.filter((profile) => !safetyHiddenIds.includes(profile.id));

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

      setNotice('');

      try {
        const [profiles, likedIds, matchedIds, nextHiddenUserIds] = await Promise.all([
          getPublicProfiles(user.id),
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
    <PageShell description="検索条件はまだダミーです。タグで探せる雰囲気を先に実装しています。" eyebrow="Discover" title="ご縁を探す">
      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      <Card className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <Badge className="w-fit">{useSupabaseLikes ? 'Supabase likes' : 'ローカルデモ'}</Badge>
          {useSupabaseLikes ? <span className="text-xs font-bold text-theme-muted">いいね済み {likedUserIds.length}件</span> : null}
        </div>
        <Input label="キーワード" name="search" placeholder="趣味・地域で探す" />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => <Badge key={filter}><Search size={12} />{filter}</Badge>)}
        </div>
      </Card>
      <div className="space-y-4">
        {visibleUsers.map((profile) => (
          <ProfileCard compact isCurrentUser={profile.id === user?.id} key={profile.id} liked={useSupabaseLikes ? likedUserIds.includes(profile.id) : undefined} matched={useSupabaseLikes ? matchedUserIds.includes(profile.id) : undefined} onToggleLike={useSupabaseLikes ? handleSupabaseLike : undefined} user={profile} />
        ))}
      </div>
    </PageShell>
  );
}
