import { Ban, Flag, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getActivityPostById } from '../lib/activityBoardApi';
import { blockUser as blockSupabaseUser, hasSafetyBlockBetween } from '../lib/blockApi';
import { getMessageMatchById, getMessagesByMatchId, sendMessage as sendSupabaseMessage } from '../lib/messageApi';
import { reportUser as reportSupabaseUser } from '../lib/reportApi';
import type { Message, MessageMatch } from '../types/message';

const reportReasonOptions = ['不適切なプロフィール', '迷惑行為', 'なりすまし', '不安を感じた', 'その他'];

export function MessagesPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoUser = mockUsers.find((mockUser) => mockUser.id === matchId);
  const { blockUser, ensureMatchMessages, isMatched, messagesByMatchId, reportUser, sendMessage: sendDemoMessage } = useAppState();
  const { isAuthenticated, isSupabaseMode, user: authUser } = useAuth();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [sendError, setSendError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [blockedConversation, setBlockedConversation] = useState(false);
  const [savingSafety, setSavingSafety] = useState(false);
  const [supabaseMessages, setSupabaseMessages] = useState<Message[]>([]);
  const [messageMatch, setMessageMatch] = useState<MessageMatch | null>(null);
  const [activityContextTitle, setActivityContextTitle] = useState('');
  const useSupabaseMessages = isSupabaseMode && isAuthenticated && Boolean(authUser);
  const activityPostId = searchParams.get('postId') ?? '';

  useEffect(() => {
    if (!useSupabaseMessages && matchId) ensureMatchMessages(matchId);
  }, [ensureMatchMessages, matchId, useSupabaseMessages]);

  useEffect(() => {
    let mounted = true;

    async function loadSupabaseMessages() {
      if (!useSupabaseMessages) {
        setSupabaseMessages([]);
        setMessageMatch(null);
        setFetchError('');
        setBlockedConversation(false);
        return;
      }

      if (!matchId) {
        setFetchError('コネクト済みの相手とのみ会話できます。');
        return;
      }

      setLoading(true);
      setFetchError('');
      setSendError('');

      try {
        const nextMatch = await getMessageMatchById(matchId);
        if (!mounted) return;

        if (!nextMatch) {
          setMessageMatch(null);
          setSupabaseMessages([]);
          setFetchError('コネクト済みの相手とのみ会話できます。');
          return;
        }

        const safetyBlocked = await hasSafetyBlockBetween(nextMatch.otherUserId);
        const nextMessages = await getMessagesByMatchId(matchId);
        if (!mounted) return;
        setMessageMatch(nextMatch);
        setBlockedConversation(safetyBlocked);
        setSupabaseMessages(nextMessages);
      } catch (caughtError) {
        if (!mounted) return;
        console.info('[ConnectBloom] messages fetch success', { success: false });
        setMessageMatch(null);
        setBlockedConversation(false);
        setSupabaseMessages([]);
        setFetchError(caughtError instanceof Error ? `会話の取得に失敗しました: ${caughtError.message}` : '会話の取得に失敗しました。');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSupabaseMessages();

    return () => {
      mounted = false;
    };
  }, [matchId, useSupabaseMessages]);

  const activeMatchId = matchId ?? '';
  const demoMessages = messagesByMatchId[activeMatchId] ?? [];
  const messages = useSupabaseMessages ? supabaseMessages : demoMessages;
  const safetyTargetUserId = useSupabaseMessages ? messageMatch?.otherUserId : activeMatchId;
  const titleName = useSupabaseMessages ? messageMatch?.otherProfile?.name : demoUser?.name;
  const headerDescription = useSupabaseMessages
    ? 'ご縁がつながった相手とだけ話せます。焦らず、丁寧にやり取りしましょう。'
    : '送信内容はlocalStorageに保存され、リロード後も残るデモです。';
  useEffect(() => {
    let mounted = true;

    async function loadActivityContext() {
      setActivityContextTitle('');
      if (!useSupabaseMessages || !activityPostId) return;

      try {
        const activityPost = await getActivityPostById(activityPostId);
        if (mounted) setActivityContextTitle(activityPost?.title ?? '');
      } catch {
        if (mounted) setActivityContextTitle('');
      }
    }

    void loadActivityContext();
    return () => {
      mounted = false;
    };
  }, [activityPostId, useSupabaseMessages]);

  const emptyText = useMemo(() => (
    useSupabaseMessages
      ? 'まだ会話はありません。まずはゆっくり、安心できるひと言から始めましょう。'
      : 'まだ会話はありません。デモの会話を送ってみましょう。'
  ), [useSupabaseMessages]);

  if (!useSupabaseMessages) {
    if (!demoUser || !matchId) {
      return <Navigate replace to="/matches" />;
    }

    if (!isMatched(matchId)) {
      return <Navigate replace to="/matches" />;
    }
  }

  async function handleSendMessage() {
    if (!activeMatchId || sending || blockedConversation) return;

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      setSendError('会話内容を入力してください。');
      return;
    }

    setSendError('');

    if (!useSupabaseMessages) {
      if (blockedConversation) {
        setSendError('ブロック済みの相手には会話を送れません。');
        return;
      }
      sendDemoMessage(activeMatchId, trimmedDraft);
      setDraft('');
      return;
    }

    setSending(true);

    try {
      const result = await sendSupabaseMessage(activeMatchId, trimmedDraft);
      if (!result.success || !result.message) {
        setSendError(result.errorMessage ?? '会話の送信に失敗しました。');
        return;
      }

      setSupabaseMessages((currentMessages) => [...currentMessages, result.message as Message]);
      setDraft('');
    } catch (caughtError) {
      setSendError(caughtError instanceof Error ? `会話の送信に失敗しました: ${caughtError.message}` : '通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSending(false);
    }
  }



  async function handleBlock() {
    if (!safetyTargetUserId || savingSafety) return;
    const confirmed = window.confirm('この相手をブロックしますか？コネクト一覧へ戻り、会話送信も停止します。');
    if (!confirmed) return;

    setNotice('');
    setSendError('');
    setSavingSafety(true);

    try {
      if (useSupabaseMessages) {
        await blockSupabaseUser(safetyTargetUserId);
      } else {
        blockUser(safetyTargetUserId);
      }
      setBlockedConversation(true);
      setNotice('ブロックしました。一覧や今日のつながりから非表示になります。');
      navigate('/matches', { replace: true });
    } catch (caughtError) {
      setSendError(caughtError instanceof Error ? `ブロックに失敗しました: ${caughtError.message}` : 'ブロックに失敗しました。通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSavingSafety(false);
    }
  }

  async function handleReport() {
    if (!safetyTargetUserId || savingSafety) return;
    const reasonText = `${reportReasonOptions.map((reason, index) => `${index + 1}. ${reason}`).join('\n')}\n\n番号または理由を入力してください。`;
    const reasonInput = window.prompt(reasonText, reportReasonOptions[0]);
    if (reasonInput === null) return;

    const selectedIndex = Number(reasonInput.trim()) - 1;
    const reason = reportReasonOptions[selectedIndex] ?? reasonInput.trim();
    if (!reason) {
      setSendError('通報理由を選択してください。');
      return;
    }

    const detail = window.prompt('補足があれば入力してください（任意）。個人情報は書かなくて大丈夫です。', '') ?? undefined;

    setNotice('');
    setSendError('');
    setSavingSafety(true);

    try {
      if (useSupabaseMessages) {
        await reportSupabaseUser(safetyTargetUserId, reason, detail);
      } else {
        reportUser(safetyTargetUserId);
      }
      setNotice('通報を受け付けました。安心して使える場を守るため、運営が確認します。');
    } catch (caughtError) {
      setSendError(caughtError instanceof Error ? `通報に失敗しました: ${caughtError.message}` : '通報に失敗しました。通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSavingSafety(false);
    }
  }

  return (
    <PageShell description={headerDescription} eyebrow="Message" title={titleName ? `${titleName}さんとの会話` : 'ゆっくり会話'}>
      <Card className="space-y-2.5 bg-theme-accent-soft/45 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-theme-text">{useSupabaseMessages ? 'Supabase messages 保存中' : 'ローカルデモ'}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-theme-muted">会話は軽い連絡先交換ではなく、ご縁がつながった相手とゆっくり会話を始める場所です。</p>
          </div>
          <Badge>{loading ? '取得中' : <><Sparkles size={12} />ご縁</>}</Badge>
        </div>
      </Card>

      {activityPostId ? (
        <Card className="space-y-1 bg-cyan-50/70 shadow-sm">
          <p className="text-sm font-black text-cyan-800">募集ボードからつながった会話です。</p>
          <p className="text-xs font-bold leading-5 text-cyan-700">{activityContextTitle ? `この会話は「${activityContextTitle}」への参加から始まりました。` : 'まずは日程や進め方を相談してみましょう。'}</p>
        </Card>
      ) : null}

      {messageMatch?.otherProfile ? (
        <Card className="flex items-center gap-3 bg-theme-background/75 shadow-sm">
          <ProfileAvatar className="size-12 rounded-2xl" fallbackClassName="text-xl font-black" user={messageMatch.otherProfile} />
          <span className="min-w-0 flex-1">
            <span className="block font-black">{messageMatch.otherProfile.name}<span className="ml-1 text-xs text-theme-muted">{messageMatch.otherProfile.age}</span></span>
            <span className="block text-xs leading-5 text-theme-muted">{messageMatch.otherProfile.location}・{messageMatch.otherProfile.datingTemperature}</span>
          </span>
          <MessageCircle className="text-theme-main" size={19} />
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-center text-sm font-bold text-theme-text">{notice}</div> : null}
      {fetchError ? (
        <Card className="space-y-3 bg-theme-accent-soft/55 text-center shadow-sm">
          <p className="text-sm font-bold leading-6 text-theme-text">{fetchError}</p>
          <Link to="/matches"><Button variant="secondary">コネクト一覧へ戻る</Button></Link>
        </Card>
      ) : null}

      {!fetchError ? (
        <Card className="flex min-h-[56vh] flex-col gap-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex-1 space-y-2.5">
            {loading ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold text-theme-muted">会話を読み込んでいます。</p> : null}
            {!loading && messages.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">{emptyText}</p> : null}
            {messages.map((message) => {
              const isMine = useSupabaseMessages ? message.senderId === authUser?.id : message.senderId === 'current-user';
              return (
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`} key={message.id}>
                  <div className={`max-w-[78%] rounded-[1.15rem] px-3.5 py-2.5 text-[13px] leading-5 ${isMine ? 'bg-theme-main text-white' : 'bg-theme-accent-soft text-theme-text'}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-[10px] font-bold ${isMine ? 'text-white/75' : 'text-theme-muted'}`}>{new Date(message.createdAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {blockedConversation ? <p className="rounded-xl bg-theme-accent-soft/60 px-3 py-2 text-xs font-bold text-theme-text">ブロック中または相手からブロックされているため、この会話では送信できません。</p> : null}
          {sendError ? <p className="rounded-xl bg-theme-accent-soft/60 px-3 py-2 text-xs font-bold text-theme-text">{sendError}</p> : null}
          <div className="flex items-end gap-2 border-t border-theme-main/10 pt-3">
            <Input className="min-h-10" disabled={sending || loading || blockedConversation} name="message" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleSendMessage(); }} placeholder="焦らず、丁寧にひと言を書く" value={draft} />
            <Button className="min-h-10 px-4" disabled={sending || loading || blockedConversation || !draft.trim()} onClick={() => { void handleSendMessage(); }}>
              {sending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              <span className="sr-only">送信</span>
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="grid grid-cols-2 gap-2 bg-theme-background/65 p-3.5 shadow-none">
        <Button disabled={savingSafety || !safetyTargetUserId} onClick={() => { void handleBlock(); }} variant="ghost"><Ban size={15} />ブロック</Button>
        <Button disabled={savingSafety || !safetyTargetUserId} onClick={() => { void handleReport(); }} variant="danger"><Flag size={15} />通報</Button>
      </Card>
    </PageShell>
  );
}
