import { Ban, Flag, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getMessageMatchById, getMessagesByMatchId, sendMessage as sendSupabaseMessage } from '../lib/messageApi';
import type { Message, MessageMatch } from '../types/message';

export function MessagesPage() {
  const { matchId } = useParams();
  const demoUser = mockUsers.find((mockUser) => mockUser.id === matchId);
  const { blockUser, ensureMatchMessages, isMatched, messagesByMatchId, reportUser, sendMessage: sendDemoMessage } = useAppState();
  const { isAuthenticated, isSupabaseMode, user: authUser } = useAuth();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [sendError, setSendError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [supabaseMessages, setSupabaseMessages] = useState<Message[]>([]);
  const [messageMatch, setMessageMatch] = useState<MessageMatch | null>(null);
  const useSupabaseMessages = isSupabaseMode && isAuthenticated && Boolean(authUser);

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
        return;
      }

      if (!matchId) {
        setFetchError('マッチ済みの相手とのみメッセージできます。');
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
          setFetchError('マッチ済みの相手とのみメッセージできます。');
          return;
        }

        const nextMessages = await getMessagesByMatchId(matchId);
        if (!mounted) return;
        setMessageMatch(nextMatch);
        setSupabaseMessages(nextMessages);
      } catch (caughtError) {
        if (!mounted) return;
        console.info('[EnBloom] messages fetch success', { success: false });
        setMessageMatch(null);
        setSupabaseMessages([]);
        setFetchError(caughtError instanceof Error ? `メッセージの取得に失敗しました: ${caughtError.message}` : 'メッセージの取得に失敗しました。');
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
  const titleName = useSupabaseMessages ? messageMatch?.otherProfile?.name : demoUser?.name;
  const headerDescription = useSupabaseMessages
    ? 'ご縁が咲いた相手とだけ話せます。焦らず、丁寧にやり取りしましょう。'
    : '送信内容はlocalStorageに保存され、リロード後も残るデモです。';
  const emptyText = useMemo(() => (
    useSupabaseMessages
      ? 'まだメッセージはありません。まずはゆっくり、安心できるひと言から始めましょう。'
      : 'まだメッセージはありません。デモの会話を送ってみましょう。'
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
    if (!activeMatchId || sending) return;

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      setSendError('メッセージを入力してください。');
      return;
    }

    setSendError('');

    if (!useSupabaseMessages) {
      sendDemoMessage(activeMatchId, trimmedDraft);
      setDraft('');
      return;
    }

    setSending(true);

    try {
      const result = await sendSupabaseMessage(activeMatchId, trimmedDraft);
      if (!result.success || !result.message) {
        setSendError(result.errorMessage ?? 'メッセージの送信に失敗しました。');
        return;
      }

      setSupabaseMessages((currentMessages) => [...currentMessages, result.message as Message]);
      setDraft('');
    } catch (caughtError) {
      setSendError(caughtError instanceof Error ? `メッセージの送信に失敗しました: ${caughtError.message}` : '通信に失敗しました。少し時間を置いてもう一度お試しください。');
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell description={headerDescription} eyebrow="Message" title={titleName ? `${titleName}さんとの会話` : 'ゆっくり会話'}>
      <Card className="space-y-2.5 bg-theme-accent-soft/45 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-theme-text">{useSupabaseMessages ? 'Supabase messages 保存中' : 'ローカルデモ'}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-theme-muted">DMは軽い連絡先交換ではなく、ご縁が咲いた相手とゆっくり会話を始める場所です。</p>
          </div>
          <Badge>{loading ? '取得中' : <><Sparkles size={12} />ご縁</>}</Badge>
        </div>
      </Card>

      {messageMatch?.otherProfile ? (
        <Card className="flex items-center gap-3 bg-theme-background/75 shadow-sm">
          <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${messageMatch.otherProfile.gradient} text-xl font-black text-theme-main-dark`}>{messageMatch.otherProfile.name.slice(0, 1)}</span>
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
          <Link to="/matches"><Button variant="secondary">マッチ一覧へ戻る</Button></Link>
        </Card>
      ) : null}

      {!fetchError ? (
        <Card className="flex min-h-[56vh] flex-col gap-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex-1 space-y-2.5">
            {loading ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold text-theme-muted">メッセージを読み込んでいます。</p> : null}
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
          {sendError ? <p className="rounded-xl bg-theme-accent-soft/60 px-3 py-2 text-xs font-bold text-theme-text">{sendError}</p> : null}
          <div className="flex items-end gap-2 border-t border-theme-main/10 pt-3">
            <Input className="min-h-10" disabled={sending || loading} name="message" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleSendMessage(); }} placeholder="焦らず、丁寧にひと言を書く" value={draft} />
            <Button className="min-h-10 px-4" disabled={sending || loading || !draft.trim()} onClick={() => { void handleSendMessage(); }}>
              {sending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              <span className="sr-only">送信</span>
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="grid grid-cols-2 gap-2 bg-theme-background/65 p-3.5 shadow-none">
        <Button onClick={() => { blockUser(activeMatchId); setNotice('ブロックしました。一覧や今日のご縁から非表示になります。'); }} variant="ghost"><Ban size={15} />ブロック</Button>
        <Button onClick={() => { reportUser(activeMatchId); setNotice('通報を受け付けました。'); }} variant="danger"><Flag size={15} />通報</Button>
      </Card>
    </PageShell>
  );
}
