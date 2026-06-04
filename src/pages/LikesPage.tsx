import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
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
import { getReceivedLikes, getSentLikes } from '../lib/likeApi';
import { getMyMatches } from '../lib/matchApi';
import type { LikeWithProfile } from '../types/like';
import type { MatchWithProfile } from '../types/match';
import type { UserProfile } from '../types/user';

export function LikesPage() {
  const { blockedUserIds, likedUserIds, matchedUserIds: demoMatchedUserIds, receivedLikeUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [sentLikes, setSentLikes] = useState<LikeWithProfile[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<LikeWithProfile[]>([]);
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const useSupabaseLikes = isSupabaseMode && isAuthenticated && Boolean(user);
  const demoSent = mockUsers.filter((profile) => likedUserIds.includes(profile.id) && !blockedUserIds.includes(profile.id));
  const demoReceived = mockUsers.filter((profile) => receivedLikeUserIds.includes(profile.id) && !blockedUserIds.includes(profile.id));
  const visibleSentLikes = useMemo(() => sentLikes.filter((like) => like.profile && !hiddenUserIds.includes(like.profile.id)), [hiddenUserIds, sentLikes]);
  const visibleReceivedLikes = useMemo(() => receivedLikes.filter((like) => like.profile && !hiddenUserIds.includes(like.profile.id)), [hiddenUserIds, receivedLikes]);
  const visibleMatches = useMemo(() => matches.filter((match) => !hiddenUserIds.includes(match.otherUserId)), [hiddenUserIds, matches]);
  const matchedUserIds = useMemo(() => visibleMatches.map((match) => match.otherUserId), [visibleMatches]);
  const matchIdByUserId = useMemo(() => Object.fromEntries(visibleMatches.map((match) => [match.otherUserId, match.id])), [visibleMatches]);

  useEffect(() => {
    let mounted = true;

    async function loadLikes() {
      if (!useSupabaseLikes || !user) {
        setSentLikes([]);
        setReceivedLikes([]);
        setMatches([]);
        setHiddenUserIds([]);
        setNotice('');
        return;
      }

      setLoading(true);
      setNotice('');

      try {
        const [nextSentLikes, nextReceivedLikes, nextMatches, nextHiddenUserIds] = await Promise.all([
          getSentLikes(user.id),
          getReceivedLikes(user.id),
          getMyMatches(user.id),
          getSafetyHiddenUserIds(user.id),
        ]);

        if (!mounted) return;
        setSentLikes(nextSentLikes);
        setReceivedLikes(nextReceivedLikes);
        setMatches(nextMatches);
        setHiddenUserIds(nextHiddenUserIds);
      } catch (caughtError) {
        if (!mounted) return;
        setNotice(caughtError instanceof Error ? `話してみたい一覧の取得に失敗しました: ${caughtError.message}` : '話してみたい一覧の取得に失敗しました。');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadLikes();

    return () => {
      mounted = false;
    };
  }, [useSupabaseLikes, user]);

  return (
    <PageShell description={useSupabaseLikes ? '送った「話してみたい」と届いた「話してみたい」を表示します。' : '送った「話してみたい」と、相手から届いているサンプル表示を確認できます。'} eyebrow="Talk" title="話してみたい">
      <Card className="space-y-2.5 bg-theme-accent-soft/45 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-theme-text">{useSupabaseLikes ? '送信済み' : 'デモ表示'}</p>
          {loading ? <Badge>取得中</Badge> : <Badge><Heart size={12} />送信</Badge>}
        </div>
        <p className="text-xs font-bold leading-5 text-theme-muted">
          {useSupabaseLikes ? '送受信した話してみたいはログイン中のアカウントに保存され、リロード後も残ります。コネクト済みのご縁は会話へ進めます。' : 'ログイン前はデモ表示で動きを確認できます。'}
        </p>
      </Card>

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      {useSupabaseLikes ? (
        <>
          <LikeSection emptyText="まだ届いた「話してみたい」はありません。プロフィールを整えて、ゆっくりご縁を待ちましょう。" likes={visibleReceivedLikes} matchIdByUserId={matchIdByUserId} matchedUserIds={matchedUserIds} title="届いた「話してみたい」" />
          <LikeSection emptyText="まだ送った「話してみたい」はありません。今日のつながりから気になる人に送ってみましょう。" likes={visibleSentLikes} matchIdByUserId={matchIdByUserId} matchedUserIds={matchedUserIds} title="送った「話してみたい」" />
        </>
      ) : (
        <>
          <DemoLikeSection matchedUserIds={demoMatchedUserIds} title="届いた「話してみたい」" users={demoReceived} />
          <DemoLikeSection emptyText="まだ送った「話してみたい」はありません。今日のつながりから気になる人に送ってみましょう。" matchedUserIds={demoMatchedUserIds} title="送った「話してみたい」" users={demoSent} />
        </>
      )}
    </PageShell>
  );
}

function LikeSection({ emptyText, likes, matchedUserIds, matchIdByUserId, title }: { emptyText: string; likes: LikeWithProfile[]; matchedUserIds: string[]; matchIdByUserId: Record<string, string>; title: string }) {
  return (
    <Card className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-black">{title}</h2>
        <span className="text-xs font-bold text-theme-muted">{likes.length}件</span>
      </div>
      {likes.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">{emptyText}</p> : null}
      {likes.map((like) => like.profile ? <LikeRow createdAt={like.created_at} key={like.id} matched={matchedUserIds.includes(like.profile.id)} messagePath={matchIdByUserId[like.profile.id] ? `/messages/${matchIdByUserId[like.profile.id]}` : undefined} user={like.profile} /> : null)}
    </Card>
  );
}

function DemoLikeSection({ emptyText = '相互の「話してみたい」候補です。話してみたいを送るとコネクト演出が出ます。', matchedUserIds, title, users }: { emptyText?: string; matchedUserIds: string[]; title: string; users: UserProfile[] }) {
  return (
    <Card className="space-y-2.5">
      <h2 className="font-black">{title}</h2>
      {users.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">{emptyText}</p> : null}
      {users.map((user) => <LikeRow key={user.id} matched={matchedUserIds.includes(user.id)} messagePath={matchedUserIds.includes(user.id) ? `/messages/${user.id}` : undefined} user={user} />)}
    </Card>
  );
}

function LikeRow({ createdAt, matched = false, messagePath, user }: { createdAt?: string; matched?: boolean; messagePath?: string; user: UserProfile }) {
  return (
    <div className="rounded-[1.15rem] bg-theme-accent-soft/45 p-2.5 transition hover:bg-theme-accent-soft/70">
      <Link className="flex items-center gap-2.5" to={`/profile/${user.id}`}>
        <ProfileAvatar className="size-10 rounded-xl" fallbackClassName="font-black" user={user} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{user.name}<span className="ml-1 text-xs text-theme-muted">{user.age}</span></span>
          <span className="block text-xs text-theme-muted">{user.location}</span>
          {createdAt ? <span className="block text-[11px] font-bold text-theme-muted">{new Date(createdAt).toLocaleDateString('ja-JP')}に届いたご縁</span> : null}
        </span>
        <Badge><Heart size={12} />Like</Badge>
        {matched ? <Badge className="bg-theme-main text-white"><Sparkles size={12} />コネクト済み</Badge> : <Badge className="bg-theme-main text-white"><Sparkles size={12} />相互候補</Badge>}
      </Link>
      {matched && messagePath ? (
        <div className="mt-2 flex justify-end">
          <Link to={messagePath}><Button className="min-h-9 px-3 py-1.5" variant="secondary"><MessageCircle size={15} />ゆっくり会話へ</Button></Link>
        </div>
      ) : null}
    </div>
  );
}
