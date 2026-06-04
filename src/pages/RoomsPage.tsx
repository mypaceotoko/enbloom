import { ArrowRight, ClipboardList, MessageCircle, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { demoChatRooms, roomTags } from '../data/mockChatRooms';
import { useAuth } from '../hooks/useAuth';
import { getChatRooms } from '../lib/chatRoomApi';
import type { ChatRoomWithStats } from '../types/chatRoom';

function formatLatest(value: string | null) {
  if (!value) return 'まだ投稿はありません';
  return `最新 ${new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))}`;
}

function getRoomConversationHint(slug: string) {
  if (slug === 'creative') return '制作や発信のアイデアを出し合う場所';
  if (slug === 'casual') return '趣味や日常をゆるく話す場所';
  return '会話とアイデア出しをする場所';
}

export function RoomsPage() {
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomWithStats[]>(demoChatRooms);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const canUseSupabaseRooms = isSupabaseMode && isAuthenticated;

  useEffect(() => {
    let mounted = true;

    async function loadRooms() {
      if (!canUseSupabaseRooms) {
        setRooms(demoChatRooms);
        setNotice('');
        return;
      }

      setLoading(true);
      setNotice('');
      try {
        const loadedRooms = await getChatRooms();
        if (mounted) setRooms(loadedRooms.length ? loadedRooms : demoChatRooms);
      } catch (caughtError) {
        if (mounted) {
          setRooms(demoChatRooms);
          setNotice(caughtError instanceof Error ? `ルームの読み込みに失敗しました。デモ表示に切り替えました: ${caughtError.message}` : 'ルームの読み込みに失敗しました。デモ表示に切り替えました。');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRooms();
    return () => {
      mounted = false;
    };
  }, [canUseSupabaseRooms]);

  return (
    <PageShell description="雑談やアイデア出しから、小さな企画の種を見つけられます。会話が盛り上がったら、募集ボードにつなげられます。" eyebrow="Rooms" title="ルーム">
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.3rem] bg-theme-card/84 p-5 backdrop-blur">
          <Badge className="bg-theme-main text-white"><Sparkles size={13} />会話とアイデア出しの場所</Badge>
          <p className="mt-3 text-sm leading-7 text-theme-muted">ルームでは、雑談や情報交換から一緒にやりたいことを見つけられます。</p>
          <p className="mt-3 rounded-2xl bg-theme-accent-soft/70 px-3 py-2 text-sm font-bold leading-6 text-theme-main-dark"><ClipboardList size={14} className="mr-1 inline" />会話が盛り上がったら、募集ボードで仲間を募れます。</p>
        </div>
      </Card>

      {!canUseSupabaseRooms ? (
        <Card className="space-y-2">
          <Badge>ローカルデモ</Badge>
          <p className="text-sm font-bold text-theme-text">ログインするとルームで会話できます。</p>
          <p className="text-sm leading-6 text-theme-muted">Supabase未接続・未ログイン時も、公式2ルームの一覧を確認できます。</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {loading ? <Card className="text-sm font-bold text-theme-muted">ルームを読み込んでいます...</Card> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {rooms.map((room) => (
          <Card className="flex h-full flex-col gap-4 overflow-hidden" key={room.slug}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-theme-yellow/80 via-theme-sky/25 to-theme-cyan/30 text-theme-main-dark shadow-sm shadow-theme-sky/15">
                  <MessageCircle size={24} />
                </div>
                <Badge className="bg-theme-card shadow-sm"><UsersRound size={13} />{room.message_count}件</Badge>
              </div>
              <div>
                <h2 className="text-xl font-black leading-tight text-theme-text">{room.name}</h2>
                <p className="mt-2 text-sm leading-7 text-theme-muted">{room.description}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-theme-accent-soft/55 p-3 text-sm font-bold leading-6 text-theme-main-dark">
              {getRoomConversationHint(room.slug)}
            </div>
            <div className="mt-auto space-y-3 border-t border-white/60 pt-3">
              <div className="flex flex-wrap gap-1.5">{(roomTags[room.slug] ?? ['公式']).map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
              <div className="flex flex-col gap-3 text-xs font-bold text-theme-muted sm:flex-row sm:items-center sm:justify-between">
                <span>{formatLatest(room.latest_message_at)}</span>
                <Link className="w-full sm:w-auto" to={`/rooms/${room.slug}`}><Button className="min-h-11 w-full px-4 sm:w-auto" type="button">入る<ArrowRight size={15} /></Button></Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
