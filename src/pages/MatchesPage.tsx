import { useEffect, useState } from 'react';
import { HeartHandshake, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getSafetyHiddenUserIds } from '../lib/blockApi';
import { isDemoModeEnabled } from '../lib/demoSession';
import { getSafeErrorLog } from '../lib/errorMessage';
import { getMyMatches } from '../lib/matchApi';
import type { MatchWithProfile } from '../types/match';
import type { UserProfile } from '../types/user';

export function MatchesPage() {
  const { blockedUserIds, matchedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [supabaseMatches, setSupabaseMatches] = useState<MatchWithProfile[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const useSupabaseMatches = isSupabaseMode && isAuthenticated && !isDemoModeEnabled() && Boolean(user);
  const demoMatchedUsers = mockUsers.filter((matchedUser) => matchedUserIds.includes(matchedUser.id) && !blockedUserIds.includes(matchedUser.id));
  const visibleSupabaseMatches = supabaseMatches.filter((match) => !hiddenUserIds.includes(match.otherUserId));

  useEffect(() => {
    let mounted = true;

    async function loadMatches() {
      if (!useSupabaseMatches || !user) {
        setSupabaseMatches([]);
        setHiddenUserIds([]);
        setNotice('');
        return;
      }

      setLoading(true);
      setNotice('');

      try {
        const nextMatches = await getMyMatches(user.id).catch((caughtError) => {
          console.warn('[ConnectBloom] matches page load failed', getSafeErrorLog(caughtError, 'matches_page_load_failed'));
          if (mounted) setNotice('コネクト一覧の取得に失敗しました。');
          return [];
        });
        const nextHiddenUserIds = await getSafetyHiddenUserIds(user.id).catch((caughtError) => {
          console.warn('[ConnectBloom] matches hidden users load failed', getSafeErrorLog(caughtError, 'matches_hidden_users_load_failed'));
          return [];
        });

        if (!mounted) return;
        setSupabaseMatches(nextMatches);
        setHiddenUserIds(nextHiddenUserIds);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMatches();

    return () => {
      mounted = false;
    };
  }, [useSupabaseMatches, user]);

  return (
    <PageShell description={<>お互いの「話してみたい」が重なったご縁を表示します。<br />会話へ進む相手を確認できます。</>} eyebrow="Matches" title="コネクト一覧">
      <Card className="space-y-2.5 bg-theme-accent-soft/45 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-theme-text">コネクトした人</p>
          <Badge>{loading ? '取得中' : <><Sparkles size={12} />ご縁</>}</Badge>
        </div>
        <p className="text-xs font-bold leading-5 text-theme-muted">
          お互いの「話してみたい」が重なって、ご縁がつながった状態です。
          <br />
          気になる人とは、ここから会話を始められます。
        </p>
      </Card>

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      {useSupabaseMatches ? (
        <Card className="space-y-2.5">
          {visibleSupabaseMatches.length === 0 ? <EmptyMatches /> : null}
          {visibleSupabaseMatches.map((match) => <MatchRow createdAt={match.created_at} key={match.id} messagePath={`/messages/${match.id}`} user={match.profile ?? createFallbackMatchProfile(match.otherUserId)} />)}
        </Card>
      ) : (
        <Card className="space-y-2.5">
          {demoMatchedUsers.length === 0 ? <EmptyMatches /> : null}
          {demoMatchedUsers.map((matchedUser) => <MatchRow key={matchedUser.id} messagePath={`/messages/${matchedUser.id}`} user={matchedUser} />)}
        </Card>
      )}
    </PageShell>
  );
}


function createFallbackMatchProfile(userId: string): UserProfile {
  return {
    id: userId,
    name: 'ConnectBloomユーザー',
    age: 18,
    location: 'プロフィール確認中',
    occupation: '自然体のプロフィール',
    bio: 'プロフィール情報を読み込めませんでした。会話はここから始められます。',
    interests: ['コネクト'],
    datingTemperature: 'ゆっくり話したい',
    relationshipGoal: '自然体で長く付き合える関係',
    introducedBy: 'ConnectBloom',
    gradient: 'from-sky-100 via-cyan-50 to-yellow-100',
  };
}

function EmptyMatches() {
  return (
    <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">
      まだコネクトはありません。
      <br />
      届いた「話してみたい」の相手に話してみたいを送ると「ご縁がつながりました」の控えめな演出が表示されます。
    </p>
  );
}

function MatchRow({ createdAt, messagePath, user }: { createdAt?: string; messagePath?: string; user: UserProfile }) {
  return (
    <div className="rounded-[1.05rem] bg-theme-accent-soft/45 p-2.5">
      <div className="flex items-center gap-2.5">
        <ProfileAvatar className="size-10 rounded-xl" fallbackClassName="text-lg font-black" user={user} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-5">{user.name}<span className="ml-1 text-xs text-theme-muted">{user.age}</span></span>
          <span className="block text-xs leading-4 text-theme-muted">{user.location}・{user.datingTemperature}</span>
          {createdAt ? <span className="block text-[11px] font-bold leading-4 text-theme-muted">{new Date(createdAt).toLocaleDateString('ja-JP')}にご縁がつながりました</span> : <span className="block text-[11px] font-bold leading-4 text-theme-muted">紹介のご縁からコネクトしました</span>}
        </span>
        <Badge className="bg-theme-main text-white"><Sparkles size={12} />ご縁</Badge>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {user.interests.slice(0, 3).map((interest) => <Badge className="bg-theme-background/80" key={interest}>{interest}</Badge>)}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl bg-theme-background/70 px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-theme-muted"><HeartHandshake size={14} />まずはゆっくり話したい</span>
        {messagePath ? <Link to={messagePath}><Button className="min-h-9 whitespace-nowrap px-3 py-1.5 text-xs"><MessageCircle size={15} />会話する</Button></Link> : <Button className="min-h-9 whitespace-nowrap px-3 py-1.5 text-xs" disabled><MessageCircle size={15} />会話する</Button>}
      </div>
    </div>
  );
}
