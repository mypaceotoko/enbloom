import { ArrowLeft, ClipboardList, MessageCircle, Send, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { demoChatRooms, demoRoomMessages, roomTags } from '../data/mockChatRooms';
import { useAuth } from '../hooks/useAuth';
import { deleteChatRoomMessage, getChatRoomBySlug, getChatRoomMessages, sendChatRoomMessage } from '../lib/chatRoomApi';
import type { ChatRoom, ChatRoomMessageWithProfile } from '../types/chatRoom';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function RoomDetailPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const demoRoom = useMemo(() => demoChatRooms.find((room) => room.slug === roomId) ?? null, [roomId]);
  const [room, setRoom] = useState<ChatRoom | null>(demoRoom);
  const [messages, setMessages] = useState<ChatRoomMessageWithProfile[]>(demoRoomMessages[roomId] ?? []);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const canUseSupabaseRooms = isSupabaseMode && isAuthenticated;

  useEffect(() => {
    let mounted = true;

    async function loadRoom() {
      if (!canUseSupabaseRooms) {
        setRoom(demoRoom);
        setMessages(demoRoomMessages[roomId] ?? []);
        setNotice('');
        return;
      }

      setLoading(true);
      setNotice('');
      try {
        const loadedRoom = await getChatRoomBySlug(roomId);
        if (!loadedRoom) {
          if (mounted) {
            setRoom(null);
            setMessages([]);
          }
          return;
        }
        const loadedMessages = await getChatRoomMessages(loadedRoom.id);
        if (mounted) {
          setRoom(loadedRoom);
          setMessages(loadedMessages);
        }
      } catch (caughtError) {
        if (mounted) {
          setRoom(demoRoom);
          setMessages(demoRoomMessages[roomId] ?? []);
          setNotice(caughtError instanceof Error ? `ルームの読み込みに失敗しました。デモ表示に切り替えました: ${caughtError.message}` : 'ルームの読み込みに失敗しました。デモ表示に切り替えました。');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRoom();
    return () => {
      mounted = false;
    };
  }, [canUseSupabaseRooms, demoRoom, roomId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUseSupabaseRooms || !room) {
      setNotice('ログインするとルームで会話できます。');
      return;
    }

    const trimmedBody = messageBody.trim();
    if (!trimmedBody) {
      setNotice('メッセージを入力してください。');
      return;
    }

    setSending(true);
    setNotice('');
    try {
      const sentMessage = await sendChatRoomMessage(room.id, trimmedBody);
      setMessages((currentMessages) => [...currentMessages, sentMessage]);
      setMessageBody('');
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? `送信に失敗しました: ${caughtError.message}` : '送信に失敗しました。');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    if (!canUseSupabaseRooms) return;
    try {
      await deleteChatRoomMessage(messageId);
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== messageId));
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? `削除に失敗しました: ${caughtError.message}` : '削除に失敗しました。');
    }
  }

  function handleCreateBoardPost() {
    navigate(`/board/new?roomId=${encodeURIComponent(roomId)}`);
  }

  if (!room) {
    return (
      <PageShell description="指定されたルームは見つかりませんでした。" eyebrow="Rooms" title="ルームが見つかりません">
        <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/rooms"><ArrowLeft size={16} />ルーム一覧へ戻る</Link>
        <Card className="space-y-2 text-center">
          <p className="text-base font-black text-theme-text">このルームは利用できません</p>
          <p className="text-sm leading-6 text-theme-muted">公式ルームは「クリエイティブルーム」と「雑談ルーム」の2つです。</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell description={room.description} eyebrow="Room" title={room.name}>
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/rooms"><ArrowLeft size={16} />ルーム一覧へ戻る</Link>

      <Card className="flower-gradient border-0 p-1">
        <div className="space-y-4 rounded-[1.3rem] bg-theme-card/84 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-theme-yellow/80 via-theme-sky/25 to-theme-cyan/30 text-theme-main-dark shadow-sm shadow-theme-sky/15"><MessageCircle size={24} /></div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-theme-text">{room.name}</h2>
              <p className="text-sm leading-7 text-theme-muted">{room.description}</p>
              <div className="flex flex-wrap gap-1.5">{(roomTags[room.slug] ?? ['公式']).map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
            </div>
          </div>
          <Button onClick={handleCreateBoardPost}><ClipboardList size={16} />この会話から募集を作る</Button>
        </div>
      </Card>

      {!canUseSupabaseRooms ? (
        <Card className="space-y-2">
          <Badge>ローカルデモ</Badge>
          <p className="text-sm font-bold text-theme-text">ログインするとルームで会話できます。</p>
          <p className="text-sm leading-6 text-theme-muted">未ログイン時はデモメッセージまたは空状態を表示し、送信時にログイン案内を出します。</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {loading ? <Card className="text-sm font-bold text-theme-muted">メッセージを読み込んでいます...</Card> : null}

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-theme-text">メッセージ</h2>
          <Badge className="bg-theme-card shadow-sm">{messages.length}件</Badge>
        </div>

        {!loading && messages.length === 0 ? (
          <div className="rounded-[1.25rem] bg-theme-accent-soft/55 p-5 text-center">
            <p className="text-base font-black text-theme-text">まだ会話がありません</p>
            <p className="mt-2 text-sm leading-6 text-theme-muted">最初のひとことから、企画の種が生まれるかもしれません。</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((message) => {
            const isOwnMessage = user?.id === message.sender_id;
            return (
              <div className="rounded-[1.15rem] bg-white/75 p-3 shadow-sm ring-1 ring-theme-sky/10" key={message.id}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-theme-text">{message.profile?.name ?? 'ConnectBloomユーザー'}</p>
                    <p className="text-[11px] font-bold text-theme-muted">{formatDateTime(message.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="inline-flex size-8 items-center justify-center rounded-full bg-theme-accent-soft text-theme-muted" title="通報"><ShieldAlert size={14} /></button>
                    {isOwnMessage ? <button className="inline-flex size-8 items-center justify-center rounded-full bg-rose-50 text-rose-600" title="削除" type="button" onClick={() => handleDelete(message.id)}><Trash2 size={14} /></button> : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-theme-text">{message.body}</p>
              </div>
            );
          })}
        </div>

        <form className="space-y-3 border-t border-white/60 pt-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>メッセージ入力</span>
            <textarea className="theme-input min-h-28 w-full rounded-xl border px-3.5 py-3 text-sm outline-none" maxLength={2000} placeholder="気軽に話してみましょう。企画の種が見つかったら募集ボードへ。" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
          </label>
          <Button disabled={sending} type="submit"><Send size={16} />送信</Button>
        </form>
      </Card>
    </PageShell>
  );
}
