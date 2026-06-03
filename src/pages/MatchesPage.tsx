import { useEffect, useState } from 'react';
import { HeartHandshake, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getMyMatches } from '../lib/matchApi';
import type { MatchWithProfile } from '../types/match';
import type { UserProfile } from '../types/user';

export function MatchesPage() {
  const { matchedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [supabaseMatches, setSupabaseMatches] = useState<MatchWithProfile[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const useSupabaseMatches = isSupabaseMode && isAuthenticated && Boolean(user);
  const demoMatchedUsers = mockUsers.filter((matchedUser) => matchedUserIds.includes(matchedUser.id));

  useEffect(() => {
    let mounted = true;

    async function loadMatches() {
      if (!useSupabaseMatches || !user) {
        setSupabaseMatches([]);
        setNotice('');
        return;
      }

      setLoading(true);
      setNotice('');

      try {
        const nextMatches = await getMyMatches(user.id);
        if (!mounted) return;
        setSupabaseMatches(nextMatches);
      } catch (caughtError) {
        if (!mounted) return;
        setSupabaseMatches([]);
        setNotice(caughtError instanceof Error ? `マッチ一覧の取得に失敗しました: ${caughtError.message}` : 'マッチ一覧の取得に失敗しました。');
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
    <PageShell description={useSupabaseMatches ? 'Supabase matches テーブルから、相互いいねで咲いたご縁を表示します。' : '相互いいねで咲いたご縁を表示し、DMデモへ進めます。'} eyebrow="Matches" title="マッチ">
      <Card className="space-y-2.5 bg-theme-accent-soft/45 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-theme-text">{useSupabaseMatches ? 'Supabase保存中' : 'ローカルデモ'}</p>
          <Badge>{loading ? '取得中' : <><Sparkles size={12} />ご縁</>}</Badge>
        </div>
        <p className="text-xs font-bold leading-5 text-theme-muted">
          マッチは軽いスワイプの結果ではなく、お互いの「また話したい」が重なってご縁が咲いた状態として扱います。
        </p>
      </Card>

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      {useSupabaseMatches ? (
        <Card className="space-y-2.5">
          {supabaseMatches.length === 0 ? <EmptyMatches /> : null}
          {supabaseMatches.map((match) => match.profile ? <MatchRow createdAt={match.created_at} key={match.id} messagePath={`/messages/${match.id}`} user={match.profile} /> : null)}
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

function EmptyMatches() {
  return (
    <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">
      まだマッチはありません。もらったいいねの相手にいいねすると「ご縁が咲きました」の控えめな演出が表示されます。
    </p>
  );
}

function MatchRow({ createdAt, messagePath, user }: { createdAt?: string; messagePath?: string; user: UserProfile }) {
  return (
    <div className="rounded-[1.15rem] bg-theme-accent-soft/45 p-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${user.gradient} text-xl font-black text-theme-main-dark`}>{user.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-black">{user.name}<span className="ml-1 text-xs text-theme-muted">{user.age}</span></span>
          <span className="block text-xs leading-5 text-theme-muted">{user.location}・{user.datingTemperature}</span>
          {createdAt ? <span className="block text-[11px] font-bold text-theme-muted">{new Date(createdAt).toLocaleDateString('ja-JP')}にご縁が咲きました</span> : <span className="block text-[11px] font-bold text-theme-muted">紹介のご縁からマッチしました</span>}
        </span>
        <Badge className="bg-theme-accent text-white"><Sparkles size={12} />ご縁</Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {user.interests.slice(0, 3).map((interest) => <Badge className="bg-theme-background/80" key={interest}>{interest}</Badge>)}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-theme-background/70 px-2.5 py-2">
        <span className="flex items-center gap-1 text-xs font-bold text-theme-muted"><HeartHandshake size={14} />まずはゆっくり会話へ</span>
        {messagePath ? <Link to={messagePath}><Button className="min-h-10 px-3 py-2"><MessageCircle size={16} />ゆっくり会話へ</Button></Link> : <Button className="min-h-10 px-3 py-2" disabled><MessageCircle size={16} />ゆっくり会話へ</Button>}
      </div>
    </div>
  );
}
