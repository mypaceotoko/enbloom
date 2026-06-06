import type { ReactNode } from 'react';
import { Ban, Flag, Heart, Leaf, Loader2, MapPin, MessageCircle, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { useLanguage } from '../hooks/useLanguage';
import { blockUser as blockSupabaseUser } from '../lib/blockApi';
import { createLike, deleteLike, getLikedUserIds } from '../lib/likeApi';
import { adminCreateOrGetDirectConversation, getMyMatches } from '../lib/matchApi';
import { getPrimaryProfilePhoto } from '../lib/profilePhotoApi';
import { getPublicProfileById, profileRowToUserProfile } from '../lib/profileApi';
import { reportUser as reportSupabaseUser } from '../lib/reportApi';
import type { UserProfile } from '../types/user';
import { isDemoModeEnabled } from '../lib/demoSession';

const reportReasonOptions = ['不適切なプロフィール', '迷惑行為', 'なりすまし', '不安を感じた', 'その他'];

export function ProfileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { from?: string; profilePreview?: UserProfile } | null;
  const routePreview = routeState?.profilePreview ?? null;
  const routePreviewUser = routePreview?.id === id ? routePreview : null;
  const demoUser = mockUsers.find((mockUser) => mockUser.id === id);
  const { blockUser, isLiked, isMatched, isReported, reportUser, toggleLike } = useAppState();
  const { isAuthenticated, isSupabaseMode, user: authUser } = useAuth();
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const [supabaseUser, setSupabaseUser] = useState<UserProfile | null>(null);
  const [supabaseLiked, setSupabaseLiked] = useState(false);
  const [supabaseMatchId, setSupabaseMatchId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSafety, setSavingSafety] = useState(false);
  const [startingAdminMessage, setStartingAdminMessage] = useState(false);
  const useSupabaseProfile = isSupabaseMode && isAuthenticated && !isDemoModeEnabled() && Boolean(authUser) && Boolean(id);

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
        const [profile, likedIds, matches, primaryPhoto] = await Promise.all([
          getPublicProfileById(id),
          getLikedUserIds(authUser.id),
          getMyMatches(authUser.id),
          getPrimaryProfilePhoto(id).catch(() => null),
        ]);
        if (!mounted) return;
        setSupabaseUser(profile ? profileRowToUserProfile(profile, primaryPhoto?.publicUrl) : null);
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

  const profileUser = supabaseUser ?? routePreviewUser ?? demoUser ?? null;

  if (!id) {
    return <Navigate replace to="/discover" />;
  }

  const liked = profileUser ? (useSupabaseProfile ? supabaseLiked : isLiked(profileUser.id)) : false;
  const matched = profileUser ? (useSupabaseProfile ? Boolean(supabaseMatchId) : isMatched(profileUser.id)) : false;
  const reported = profileUser ? isReported(profileUser.id) : false;
  const talkTopics = profileUser?.talkTopics?.trim() ?? '';

  async function handleLike() {
    if (!profileUser) return;

    setNotice('');
    setErrorNotice('');

    if (!useSupabaseProfile) {
      const becameMatched = toggleLike(profileUser.id);
      setNotice(becameMatched ? 'ご縁がつながりました。会話を始めてみましょう。' : liked ? '話してみたいを取り消しました。' : '話してみたいを送りました。');
      return;
    }

    try {
      if (liked) {
        await deleteLike(profileUser.id);
        setSupabaseLiked(false);
        setNotice('話してみたいを取り消しました。');
        return;
      }

      const likeResult = await createLike(profileUser.id);
      setSupabaseLiked(true);
      if (likeResult.matched) {
        setSupabaseMatchId(likeResult.matchId ?? supabaseMatchId);
        setNotice('ご縁がつながりました。会話を始めてみましょう。');
      } else {
        setNotice(likeResult.matchCheckError ?? '話してみたいを送りました。');
      }
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error && /自分自身/.test(caughtError.message)
        ? caughtError.message
        : '通信に失敗しました。少し時間を置いてもう一度お試しください。';
      setErrorNotice(errorMessage);
    }
  }

  async function handleBlock() {
    if (!profileUser) return;
    const confirmed = window.confirm(`${profileUser.name}さんをブロックしますか？一覧や会話導線から非表示になります。`);
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
      setNotice(`${profileUser.name}さんをブロックしました。今日のつながりや一覧には表示されません。`);
    } catch (caughtError) {
      setErrorNotice(caughtError instanceof Error ? `ブロックに失敗しました: ${caughtError.message}` : 'ブロックに失敗しました。通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSavingSafety(false);
    }
  }

  async function handleAdminMessage() {
    if (!profileUser || !useSupabaseProfile || !isAdmin || startingAdminMessage) return;

    setNotice('');
    setErrorNotice('');
    setStartingAdminMessage(true);

    try {
      const result = await adminCreateOrGetDirectConversation(profileUser.id);
      if (!result.success || !result.matchId) {
        setErrorNotice(result.message ?? '管理者メッセージ用の会話作成に失敗しました。');
        return;
      }

      navigate(`/messages/${result.matchId}`);
    } catch (caughtError) {
      setErrorNotice(caughtError instanceof Error ? caughtError.message : '管理者メッセージ用の会話作成に失敗しました。');
    } finally {
      setStartingAdminMessage(false);
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
      <PageShell eyebrow="Profile" title={loading ? 'プロフィールを読み込み中' : t('profile.couldNotLoad')}>
        <Button className="min-h-10 px-3 text-sm" onClick={() => navigate(-1)} variant="ghost">← {t('profile.back')}</Button>
        {errorNotice ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{errorNotice}</div> : null}
        <Card className="flex items-center gap-2 text-sm font-bold text-theme-muted">
          {loading ? <><Loader2 className="animate-spin" size={16} />プロフィールを読み込んでいます。</> : t('profile.couldNotLoad')}
        </Card>
        {!loading ? <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/discover">人を探すへ戻る</Link> : null}
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Profile" title={t('profile.title')}>
      <Button className="min-h-10 w-fit px-3 text-sm" onClick={() => navigate(-1)} variant="ghost">← {t('profile.back')}</Button>
      <Card className="overflow-hidden p-0">
        <div className={`relative h-72 overflow-hidden bg-gradient-to-br ${profileUser.gradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.86),transparent_28%),radial-gradient(circle_at_78%_76%,rgba(255,255,255,0.45),transparent_25%)]" />
          <Badge className="absolute left-4 top-4 border border-white/70 bg-white/75 backdrop-blur"><Sparkles size={13} />{t('profile.today')}</Badge>
          <div className="absolute bottom-4 left-4 right-4 rounded-[1.45rem] bg-theme-card/78 p-3.5 shadow-xl shadow-theme-main/10 backdrop-blur">
            <div className="flex items-end gap-3">
              <ProfileAvatar className="size-20 shrink-0 rounded-[1.45rem] border border-white/80 shadow-lg" fallbackClassName="bg-white/70 text-2xl font-black" user={profileUser} />
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
            {matched ? <Badge className="bg-theme-main text-white">コネクト済み</Badge> : null}
          </div>

          <div className="space-y-2"><p className="text-sm font-black">{t('profile.about')}</p><p className="rounded-[1.15rem] bg-theme-background/70 p-3.5 text-[13px] leading-6 text-theme-text">{profileUser.bio}</p></div>

          <div className="space-y-2">
            <p className="text-sm font-black">{t('profile.activities')}</p>
            <div className="flex flex-wrap gap-1.5">{profileUser.interests.map((interest) => <Badge className="bg-theme-accent-soft/80" key={interest}>{interest}</Badge>)}</div>
          </div>

          <InfoBlock icon={<MessageCircle size={17} />} title={t('profile.connectionStyle')} body={profileUser.datingTemperature} />
          <InfoBlock icon={<UserRoundCheck size={17} />} title={t('profile.introductionShared')} body={`${profileUser.introducedBy}からの紹介。共通点: ${profileUser.interests.join('、')}`} />
          {talkTopics ? <InfoBlock icon={<MessageCircle size={17} />} title={t('profile.talkTopics')} body={talkTopics} /> : null}

          {isAdmin && useSupabaseProfile && profileUser.id !== authUser?.id ? (
            <Card className="space-y-2.5 border border-theme-main/15 bg-theme-accent-soft/55 p-3.5 shadow-sm">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 shrink-0 text-theme-main" size={17} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-theme-text">管理者メッセージ</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-theme-muted">運営者として、このユーザーへ直接メッセージを送れます。</p>
                </div>
              </div>
              <Button className="w-full" disabled={startingAdminMessage} onClick={() => { void handleAdminMessage(); }} type="button" variant="secondary">
                {startingAdminMessage ? <Loader2 className="animate-spin" size={16} /> : <MessageCircle size={16} />}
                管理者メッセージを送る
              </Button>
            </Card>
          ) : null}

          <div className="sticky bottom-24 z-10 space-y-2 rounded-[1.25rem] border border-white/60 bg-theme-card/88 p-2.5 shadow-2xl shadow-theme-main/15 backdrop-blur">
            <Button className={`w-full ${liked ? 'bg-gradient-to-r from-theme-cyan to-theme-main text-white shadow-theme-main/25 hover:saturate-125' : 'bg-theme-accent-soft text-theme-text'}`} onClick={() => { void handleLike(); }} variant="secondary">
              <Heart fill={liked ? 'currentColor' : 'none'} size={16} />{liked ? t('profile.sent') : t('profile.like')}
            </Button>
            {matched ? <Link to={`/messages/${useSupabaseProfile ? supabaseMatchId : profileUser.id}`}><Button className="w-full"><MessageCircle size={16} />会話へ</Button></Link> : null}
            <p className="text-center text-xs font-bold text-theme-muted">{useSupabaseProfile ? '送信状態を保存しています。' : 'デモ状態で動作しています。'}</p>
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
