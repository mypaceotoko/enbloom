import { ArrowLeft, ClipboardList, Send, ShieldAlert, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { demoChatRooms, demoRoomMessages, roomTags } from '../data/mockChatRooms';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { deleteChatRoomMessage, getChatRoomByIdentifier, getChatRoomMessages, sendChatRoomMessage } from '../lib/chatRoomApi';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import { getRoomVisual } from '../lib/roomVisual';
import type { ChatRoom, ChatRoomMessageWithProfile } from '../types/chatRoom';
import type { TranslationKey } from '../lib/i18n';

const roomTagTranslationKeys: Record<string, TranslationKey> = {
  公式: 'rooms.tag.official',
  共創: 'rooms.tag.coCreate',
  制作: 'rooms.tag.create',
  企画: 'rooms.tag.plan',
  雑談: 'rooms.tag.chat',
  趣味: 'rooms.tag.hobby',
  日常: 'rooms.tag.daily',
  ゆるく話す: 'rooms.tag.slowTalk',
};

function getRoomNameKey(slug: string): TranslationKey | null {
  if (slug === 'creative') return 'rooms.creative';
  if (slug === 'casual') return 'rooms.casual';
  return null;
}

function getRoomConversationHintKey(slug: string): TranslationKey {
  if (slug === 'creative') return 'roomDetail.hint.creative';
  if (slug === 'casual') return 'roomDetail.hint.casual';
  return 'roomDetail.hint.default';
}

function getRoomDetailDescriptionKey(slug: string): TranslationKey | null {
  if (slug === 'creative') return 'roomDetail.description.creative';
  if (slug === 'casual') return 'roomDetail.description.casual';
  return null;
}

function SentenceLines({ text }: { text: string }) {
  const lines = text.split(/(?<=[。.!?])/).map((line) => line.trim()).filter(Boolean);

  return (
    <>
      {lines.map((line) => (
        <span className="block" key={line}>{line}</span>
      ))}
    </>
  );
}

export function RoomDetailPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const { isFounder } = useAdmin();
  const { language, t } = useLanguage();
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
        const loadedRoom = await getChatRoomByIdentifier(roomId);
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
        console.warn('[ConnectBloom] room detail load failed', getSafeErrorLog(caughtError, 'room_detail_load_failed'));
        if (mounted) {
          setRoom(demoRoom);
          setMessages(demoRoomMessages[roomId] ?? []);
          setNotice(getShortErrorMessage(caughtError, 'ルームの読み込みに失敗しました。デモ表示に切り替えました。'));
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
      setNotice(t('roomDetail.login'));
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
      console.warn('[ConnectBloom] room message send failed', getSafeErrorLog(caughtError, 'room_message_send_failed'));
      setNotice(getShortErrorMessage(caughtError, '送信に失敗しました。'));
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    if (!canUseSupabaseRooms) return;
    try {
      const message = messages.find((currentMessage) => currentMessage.id === messageId);
      const confirmed = message && isFounder && message.sender_id !== user?.id
        ? window.confirm('このルーム発言を管理者削除しますか？')
        : true;
      if (!confirmed) return;
      await deleteChatRoomMessage(messageId);
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== messageId));
    } catch (caughtError) {
      console.warn('[ConnectBloom] room message delete failed', getSafeErrorLog(caughtError, 'room_message_delete_failed'));
      setNotice(getShortErrorMessage(caughtError, '削除に失敗しました。'));
    }
  }

  function handleCreateBoardPost() {
    navigate(`/board/new?roomId=${encodeURIComponent(roomId)}`);
  }

  function formatDateTime(value: string) {
    const locale = language === 'en' ? 'en-US' : 'ja-JP';
    return new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  function getRoomDisplayName(nextRoom: ChatRoom) {
    const key = getRoomNameKey(nextRoom.slug);
    return key ? t(key) : nextRoom.name;
  }

  function getRoomDetailDescription(nextRoom: ChatRoom) {
    const key = getRoomDetailDescriptionKey(nextRoom.slug);
    return key ? t(key) : nextRoom.description;
  }

  function getRoomTag(tag: string) {
    const key = roomTagTranslationKeys[tag];
    return key ? t(key) : tag;
  }

  if (!room) {
    return (
      <PageShell description="指定されたルームは見つかりませんでした。" eyebrow="Rooms" title="ルームが見つかりません">
        <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/rooms"><ArrowLeft size={16} />{t('roomDetail.back')}</Link>
        <Card className="space-y-2 text-center">
          <p className="text-base font-black text-theme-text">このルームは利用できません</p>
          <p className="text-sm leading-6 text-theme-muted">公式ルームは「クリエイティブルーム」と「雑談ルーム」の2つです。</p>
        </Card>
      </PageShell>
    );
  }

  const roomDescription = getRoomDetailDescription(room);
  const { Icon: RoomIcon, className: roomIconClassName } = getRoomVisual(room);

  return (
    <PageShell description={<SentenceLines text={roomDescription} />} eyebrow="Room" title={getRoomDisplayName(room)}>
      <Link className="inline-flex items-center gap-1 text-sm font-black text-theme-main-dark" to="/rooms"><ArrowLeft size={16} />{t('roomDetail.back')}</Link>

      <Card className="flower-gradient border-0 p-1">
        <div className="space-y-3 rounded-[1.3rem] bg-theme-card/84 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ${roomIconClassName}`}><RoomIcon size={21} /></div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-theme-text">{getRoomDisplayName(room)}</h2>
                <Badge className="bg-theme-card shadow-sm"><UsersRound size={13} />{messages.length}件</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">{(roomTags[room.slug] ?? ['公式']).map((tag) => <Badge key={tag}>#{getRoomTag(tag)}</Badge>)}</div>
            </div>
          </div>
          <p className="rounded-2xl bg-theme-accent-soft/60 px-3 py-2 text-[13px] font-bold leading-5 text-theme-main-dark">{t(getRoomConversationHintKey(room.slug))}</p>
          <div className="flex flex-col gap-2 rounded-2xl bg-white/70 p-3 ring-1 ring-theme-sky/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold leading-5 text-theme-muted">{t('roomDetail.fromConversation')}</p>
            <Button className="min-h-10 w-full px-3 py-2 text-xs sm:w-auto" onClick={handleCreateBoardPost}><ClipboardList size={15} />{t('roomDetail.createBoard')}</Button>
          </div>
        </div>
      </Card>

      {!canUseSupabaseRooms ? (
        <Card className="space-y-2">
          <Badge>{t('roomDetail.demoView')}</Badge>
          <p className="text-sm font-bold text-theme-text">{t('roomDetail.login')}</p>
          <p className="text-sm leading-6 text-theme-muted">{t('roomDetail.demoHint')}</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {loading ? <Card className="text-sm font-bold text-theme-muted">メッセージを読み込んでいます...</Card> : null}

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-theme-text">{t('roomDetail.messages')}</h2>
          <Badge className="bg-theme-card shadow-sm">{messages.length}件</Badge>
        </div>

        {!loading && messages.length === 0 ? (
          <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-center">
            <p className="text-[13px] font-black text-theme-text">{t('roomDetail.noMessages')}</p>
            <p className="mt-1 text-xs leading-5 text-theme-muted">{t('roomDetail.boardHint')}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          {messages.map((message) => {
            const isOwnMessage = user?.id === message.sender_id;
            return (
              <div className="rounded-[1rem] bg-white/80 px-3 py-2 shadow-sm ring-1 ring-theme-sky/10" key={message.id}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-theme-text">{message.profile?.name ?? 'ConnectBloomユーザー'}</p>
                    <p className="text-[11px] font-bold text-theme-muted">{formatDateTime(message.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="inline-flex size-7 items-center justify-center rounded-full bg-transparent text-theme-muted/65 transition hover:bg-theme-accent-soft" title={t('roomDetail.report')} type="button"><ShieldAlert size={14} /></button>
                    {isOwnMessage || isFounder ? <button className="inline-flex min-h-7 items-center justify-center gap-1 rounded-full bg-transparent px-2 text-[11px] font-black text-theme-muted/65 transition hover:bg-rose-50 hover:text-rose-600" title={isOwnMessage ? t('roomDetail.delete') : '管理者削除'} type="button" onClick={() => handleDelete(message.id)}><Trash2 size={14} />{!isOwnMessage && isFounder ? '管理者削除' : null}</button> : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-5 text-theme-text">{message.body}</p>
              </div>
            );
          })}
        </div>

        <form className="space-y-2 border-t border-white/60 pt-3" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>{t('roomDetail.sendMessage')}</span>
            <textarea className="theme-input min-h-16 w-full rounded-xl border px-3 py-2 text-sm leading-5 outline-none" maxLength={2000} placeholder={t('roomDetail.talkPlaceholder')} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {!canUseSupabaseRooms ? <p className="text-xs font-bold leading-5 text-theme-muted">{t('roomDetail.login')}</p> : null}
            <Button className="min-h-10 w-full px-3 py-2 text-xs sm:w-auto" disabled={sending} type="submit"><Send size={15} />{t('roomDetail.send')}</Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
