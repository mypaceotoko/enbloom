import { useEffect, useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getReceivedLikes, getSentLikes } from '../lib/likeApi';
import { getMatchedUserIds } from '../lib/matchApi';
import type { LikeWithProfile } from '../types/like';
import type { UserProfile } from '../types/user';

export function LikesPage() {
  const { likedUserIds, matchedUserIds: demoMatchedUserIds, receivedLikeUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [sentLikes, setSentLikes] = useState<LikeWithProfile[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<LikeWithProfile[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const useSupabaseLikes = isSupabaseMode && isAuthenticated && Boolean(user);
  const demoSent = mockUsers.filter((profile) => likedUserIds.includes(profile.id));
  const demoReceived = mockUsers.filter((profile) => receivedLikeUserIds.includes(profile.id));

  useEffect(() => {
    let mounted = true;

    async function loadLikes() {
      if (!useSupabaseLikes || !user) {
        setSentLikes([]);
        setReceivedLikes([]);
        setMatchedUserIds([]);
        setNotice('');
        return;
      }

      setLoading(true);
      setNotice('');

      try {
        const [nextSentLikes, nextReceivedLikes, nextMatchedUserIds] = await Promise.all([
          getSentLikes(user.id),
          getReceivedLikes(user.id),
          getMatchedUserIds(user.id),
        ]);

        if (!mounted) return;
        setSentLikes(nextSentLikes);
        setReceivedLikes(nextReceivedLikes);
        setMatchedUserIds(nextMatchedUserIds);
      } catch (caughtError) {
        if (!mounted) return;
        setNotice(caughtError instanceof Error ? `いいね一覧の取得に失敗しました: ${caughtError.message}` : 'いいね一覧の取得に失敗しました。');
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
    <PageShell description={useSupabaseLikes ? 'Supabase likes テーブルから、送ったいいねともらったいいねを表示します。' : '送ったいいねと、相手から届いている風のダミーいいねをlocalStorage状態で表示します。'} eyebrow="Likes" title="いいね">
      <Card className="space-y-2.5 bg-theme-accent-soft/45 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-theme-text">{useSupabaseLikes ? 'Supabase保存中' : 'ローカルデモ'}</p>
          {loading ? <Badge>取得中</Badge> : <Badge><Heart size={12} />Likes</Badge>}
        </div>
        <p className="text-xs font-bold leading-5 text-theme-muted">
          {useSupabaseLikes ? '送受信したいいねはログイン中のアカウントに紐づいて保存され、リロード後も残ります。' : 'Supabase未接続・未ログインの場合は従来通りlocalStorageデモを表示します。'}
        </p>
      </Card>

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      {useSupabaseLikes ? (
        <>
          <LikeSection emptyText="まだもらったいいねはありません。プロフィールを整えて、ゆっくりご縁を待ちましょう。" likes={receivedLikes} matchedUserIds={matchedUserIds} title="もらったいいね" />
          <LikeSection emptyText="まだ送ったいいねはありません。今日のご縁から気になる人に送ってみましょう。" likes={sentLikes} matchedUserIds={matchedUserIds} title="送ったいいね" />
        </>
      ) : (
        <>
          <DemoLikeSection matchedUserIds={demoMatchedUserIds} title="もらったいいね" users={demoReceived} />
          <DemoLikeSection emptyText="まだ送ったいいねはありません。今日のご縁から気になる人に送ってみましょう。" matchedUserIds={demoMatchedUserIds} title="送ったいいね" users={demoSent} />
        </>
      )}
    </PageShell>
  );
}

function LikeSection({ emptyText, likes, matchedUserIds, title }: { emptyText: string; likes: LikeWithProfile[]; matchedUserIds: string[]; title: string }) {
  return (
    <Card className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-black">{title}</h2>
        <span className="text-xs font-bold text-theme-muted">{likes.length}件</span>
      </div>
      {likes.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">{emptyText}</p> : null}
      {likes.map((like) => like.profile ? <LikeRow createdAt={like.created_at} key={like.id} matched={matchedUserIds.includes(like.profile.id)} user={like.profile} /> : null)}
    </Card>
  );
}

function DemoLikeSection({ emptyText = '相互いいね候補です。いいねするとマッチ演出が出ます。', matchedUserIds, title, users }: { emptyText?: string; matchedUserIds: string[]; title: string; users: UserProfile[] }) {
  return (
    <Card className="space-y-2.5">
      <h2 className="font-black">{title}</h2>
      {users.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">{emptyText}</p> : null}
      {users.map((user) => <LikeRow key={user.id} matched={matchedUserIds.includes(user.id)} user={user} />)}
    </Card>
  );
}

function LikeRow({ createdAt, matched = false, user }: { createdAt?: string; matched?: boolean; user: UserProfile }) {
  return (
    <Link className="flex items-center gap-2.5 rounded-[1.15rem] bg-theme-accent-soft/45 p-2.5 transition hover:bg-theme-accent-soft/70" to={`/profile/${user.id}`}>
      <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${user.gradient} font-black text-theme-main-dark`}>{user.name.slice(0, 1)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{user.name}<span className="ml-1 text-xs text-theme-muted">{user.age}</span></span>
        <span className="block text-xs text-theme-muted">{user.location}</span>
        {createdAt ? <span className="block text-[11px] font-bold text-theme-muted">{new Date(createdAt).toLocaleDateString('ja-JP')}に届いたご縁</span> : null}
      </span>
      <Badge><Heart size={12} />Like</Badge>
      {matched ? <Badge className="bg-theme-accent text-white"><Sparkles size={12} />マッチ済み</Badge> : <Badge className="bg-theme-accent text-white"><Sparkles size={12} />相互候補</Badge>}
    </Link>
  );
}
