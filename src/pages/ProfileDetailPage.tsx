import type { ReactNode } from 'react';
import { Ban, Flag, Heart, Leaf, Loader2, MapPin, MessageCircleHeart, MessageCircle, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { blockUser as blockSupabaseUser } from '../lib/blockApi';
import { createLike, deleteLike, getLikedUserIds } from '../lib/likeApi';
import { getMyMatches } from '../lib/matchApi';
import { getPublicProfileById, profileRowToUserProfile } from '../lib/profileApi';
import { reportUser as reportSupabaseUser } from '../lib/reportApi';
import type { UserProfile } from '../types/user';

const reportReasonOptions = ['不適切なプロフィール', '迷惑行為', 'なりすまし', '不安を感じた', 'その他'];

export function ProfileDetailPage() {
  const { id } = useParams();
  const demoUser = mockUsers.find((mockUser) => mockUser.id === id);
  const { blockUser, isLiked, isMatched, isReported, reportUser, toggleLike } = useAppState();
  const { isAuthenticated, isSupabaseMode, user: authUser } = useAuth();
  const [supabaseUser, setSupabaseUser] = useState<UserProfile | null>(null);
  const [supabaseLiked, setSupabaseLiked] = useState(false);
  const [supabaseMatchId, setSupabaseMatchId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSafety, setSavingSafety] = useState(false);
  const useSupabaseProfile = isSupabaseMode && isAuthenticated && Boolean(authUser) && Boolean(id);

  useEffect(() => {
    let mounted = true;

    async function loadSupabaseProfile() {
      if (!useSupabaseProfile || !id || !authUser) {
        setSupabaseUser(null);
        setSupabaseLiked(false);
        setSupabaseMatchId(null);
        return;
      }

      setLoading(true);
      setErrorNotice('');

      try {
        const [profile, likedIds, matches] = await Promise.all([
          getPublicProfileById(id),
          getLikedUserIds(authUser.id),
          getMyMatches(authUser.id),
        ]);
        if (!mounted) return;
        setSupabaseUser(profile ? profileRowToUserProfile(profile) : null);
        setSupabaseLiked(likedIds.includes(id));
        setSupabaseMatchId(matches.find((match) => match.otherUserId === id)?.id ?? null);
      } catch (caughtError) {
        if (!mounted) return;
        setErrorNotice(caughtError instanceof Error ? `プロフィールの取得に失敗しました: ${caughtError.message}` : '通信に失敗しました。少し時間を置いてもう一度お試しください。');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSupabaseProfile();

    return () => {
      mounted = false;
    };
  }, [authUser, id, useSupabaseProfile]);

  const profileUser = useSupabaseProfile ? supabaseUser : demoUser;

  if (!id) {
    return <Navigate replace to="/discover" />;
  }

  if (!useSupabaseProfile && !demoUser) {
    return <Navigate replace to="/discover" />;
  }

  if (useSupabaseProfile && !loading && !profileUser && !errorNotice) {
    return <Navigate replace to="/discover" />;
  }

  const liked = profileUser ? (useSupabaseProfile ? supabaseLiked : isLiked(profileUser.id)) : false;
  const matched = profileUser ? (useSupabaseProfile ? Boolean(supabaseMatchId) : isMatched(profileUser.id)) : false;
  const reported = profileUser ? isReported(profileUser.id) : false;

  async function handleLike() {
    if (!profileUser) return;

    setNotice('');
    setErrorNotice('');

    if (!useSupabaseProfile) {
      const becameMatched = toggleLike(profileUser.id);
      setNotice(becameMatched ? 'ご縁が咲きました。メッセージを送ってみましょう。' : liked ? 'いいねを取り消しました。' : 'いいねを送りました。');
      return;
    }

    try {
      if (liked) {
        await deleteLike(profileUser.id);
        setSupabaseLiked(false);
        setNotice('いいねを取り消しました。');
        return;
      }

      const likeResult = await createLike(profileUser.id);
      setSupabaseLiked(true);
      if (likeResult.matched) {
        setSupabaseMatchId(likeResult.matchId ?? supabaseMatchId);
        setNotice('ご縁が咲きました。メッセージを送ってみましょう。');
      } else {
        setNotice(likeResult.matchCheckError ?? 'いいねを送りました。');
      }
    } catch (caughtError) {
      setErrorNotice(caughtError instanceof Error ? caughtError.message : '通信に失敗しました。少し時間を置いてもう一度お試しください。');
    }
  }

  async function handleBlock() {
    if (!profileUser) return;
    const confirmed = window.confirm(`${profileUser.name}さんをブロックしますか？一覧やDM導線から非表示になります。`);
    if (!confirmed) return;

    setNotice('');
    setErrorNotice('');
    setSavingSafety(true);

    try {
      if (useSupabaseProfile) {
        await blockSupabaseUser(profileUser.id);
      } else {
        blockUser(profileUser.id);
      }
      setNotice(`${profileUser.name}さんをブロックしました。今日のご縁や一覧には表示されません。`);
    } catch (caughtError) {
      setErrorNotice(caughtError instanceof Error ? `ブロックに失敗しました: ${caughtError.message}` : 'ブロックに失敗しました。通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSavingSafety(false);
    }
  }

  async function handleReport() {
    if (!profileUser) return;
    const reasonText = `${reportReasonOptions.map((reason, index) => `${index + 1}. ${reason}`).join('\n')}\n\n番号または理由を入力してください。`;
    const reasonInput = window.prompt(reasonText, reportReasonOptions[0]);
    if (reasonInput === null) return;

    const selectedIndex = Number(reasonInput.trim()) - 1;
    const reason = reportReasonOptions[selectedIndex] ?? reasonInput.trim();
    if (!reason) {
      setErrorNotice('通報理由を選択してください。');
      return;
    }

    const detail = window.prompt('補足があれば入力してください（任意）。個人情報は書かなくて大丈夫です。', '') ?? undefined;

    setNotice('');
    setErrorNotice('');
    setSavingSafety(true);

    try {
      if (useSupabaseProfile) {
        await reportSupabaseUser(profileUser.id, reason, detail);
      } else {
        reportUser(profileUser.id);
      }
      setNotice('通報を受け付けました。安心して使える場を守るため、運営が確認します。');
    } catch (caughtError) {
      setErrorNotice(caughtError instanceof Error ? `通報に失敗しました: ${caughtError.message}` : '通報に失敗しました。通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSavingSafety(false);
    }
  }

  if (!profileUser) {
    return (
      <PageShell eyebrow="Profile" title="プロフィールを読み込み中">
        {errorNotice ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{errorNotice}</div> : null}
        <Card className="flex items-center gap-2 text-sm font-bold text-theme-muted"><Loader2 className="animate-spin" size={16} />プロフィールを読み込んでいます。</Card>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Profile" title={`${profileUser.name}さんを知る`}>
      <Card className="overflow-hidden p-0">
        <div className={`relative h-72 overflow-hidden bg-gradient-to-br ${profileUser.gradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.86),transparent_28%),radial-gradient(circle_at_78%_76%,rgba(255,255,255,0.45),transparent_25%)]" />
          <Badge className="absolute left-4 top-4 border border-white/70 bg-white/75 backdrop-blur"><Sparkles size={13} />今日のご縁</Badge>
          <div className="absolute bottom-4 left-4 right-4 rounded-[1.45rem] bg-theme-card/78 p-3.5 shadow-xl shadow-theme-main/10 backdrop-blur">
            <div className="flex items-end gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-[1.45rem] border border-white/80 bg-white/70 text-2xl font-black text-theme-main-dark shadow-lg">
                {profileUser.name.slice(0, 1)}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-black leading-none text-theme-text">{profileUser.name} <span className="text-sm text-theme-muted">{profileUser.age}</span></h1>
                <p className="mt-1.5 flex items-center gap-1 text-[13px] font-bold text-theme-muted"><MapPin size={14} />{profileUser.location}</p>
                <p className="mt-1 flex items-center gap-1 text-[13px] font-bold text-theme-main-dark"><Leaf size={14} />{profileUser.occupation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {notice ? <div className="rounded-[1.15rem] border border-theme-accent/30 bg-theme-accent-soft/80 p-3 text-center text-sm font-black text-theme-text">{notice}</div> : null}
          {errorNotice ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-center text-sm font-black text-red-600">{errorNotice}</div> : null}

          <div className="flex flex-wrap gap-1.5">
            <Badge><UserRoundCheck size={13} />{profileUser.introducedBy} からの紹介</Badge>
            <Badge className="bg-theme-background"><ShieldCheck size={13} />安心して進める</Badge>
            {matched ? <Badge className="bg-theme-accent text-white">マッチ済み</Badge> : null}
          </div>

          <p className="rounded-[1.15rem] bg-theme-background/70 p-3.5 text-[13px] leading-6 text-theme-text">{profileUser.bio}</p>

          <div className="space-y-2">
            <p className="text-sm font-black">趣味・共通点のきっかけ</p>
            <div className="flex flex-wrap gap-1.5">{profileUser.interests.map((interest) => <Badge className="bg-theme-accent-soft/80" key={interest}>{interest}</Badge>)}</div>
          </div>

          <InfoBlock icon={<MessageCircleHeart size={17} />} title="出会いの温度感" body={profileUser.datingTemperature} />
          <InfoBlock icon={<Heart size={17} />} title="関係性の希望" body={profileUser.relationshipGoal} />

          <div className="sticky bottom-24 z-10 space-y-2 rounded-[1.25rem] border border-white/60 bg-theme-card/88 p-2.5 shadow-2xl shadow-theme-main/15 backdrop-blur">
            <Button className={`w-full ${liked ? 'bg-theme-accent text-white shadow-theme-accent/25 hover:bg-theme-accent/90' : 'bg-theme-accent-soft text-theme-text'}`} onClick={() => { void handleLike(); }} variant="secondary">
              <Heart fill={liked ? 'currentColor' : 'none'} size={16} />{liked ? 'いいね済み' : 'いいねを送る'}
            </Button>
            {matched ? <Link to={`/messages/${useSupabaseProfile ? supabaseMatchId : profileUser.id}`}><Button className="w-full"><MessageCircle size={16} />メッセージを送る</Button></Link> : null}
            <p className="text-center text-xs font-bold text-theme-muted">{useSupabaseProfile ? 'Supabase likes / blocks / reports 保存中です。' : 'ローカルstate / localStorageのみで動くデモです。'}</p>
          </div>

          <Card className="space-y-2.5 bg-theme-background/65 p-3.5 shadow-none">
            <div className="flex items-center gap-2 text-[13px] font-black text-theme-text"><ShieldCheck size={15} />安心のための操作</div>
            <p className="text-xs leading-5 text-theme-muted">ブロック・通報は、ご縁を安心して育てるための安全装置です。相手には通知されません。</p>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={savingSafety} onClick={() => { void handleBlock(); }} variant="ghost"><Ban size={15} />ブロック</Button>
              <Button disabled={savingSafety} onClick={() => { void handleReport(); }} variant="danger"><Flag size={15} />{reported ? '通報済み' : '通報'}</Button>
            </div>
          </Card>
        </div>
      </Card>
    </PageShell>
  );
}

function InfoBlock({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[1.15rem] border border-theme-main/10 bg-theme-accent-soft/65 p-3.5">
      <p className="flex items-center gap-1.5 text-sm font-black text-theme-text">{icon}{title}</p>
      <p className="mt-1.5 text-[13px] leading-5 text-theme-muted">{body}</p>
    </div>
  );
}
