import { ArrowRight, Coffee, Lightbulb, MessageCircle, Sparkles, UsersRound } from 'lucide-react';
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

function getRoomVisual(room: ChatRoomWithStats) {
  if (room.slug === 'creative') {
    return {
      Icon: Lightbulb,
      className: 'from-theme-yellow/85 via-theme-cyan/30 to-theme-sky/35 text-theme-main-dark shadow-theme-yellow/20',
    };
  }

  if (room.slug === 'casual') {
    return {
      Icon: Coffee,
      className: 'from-amber-100 via-theme-yellow/35 to-theme-cyan/25 text-amber-700 shadow-amber-100/40',
    };
  }

  return {
    Icon: MessageCircle,
    className: 'from-theme-yellow/80 via-theme-sky/25 to-theme-cyan/30 text-theme-main-dark shadow-theme-sky/15',
  };
}

function getRoomShortDescription(room: ChatRoomWithStats) {
  if (room.slug === 'creative') return '制作や発信のアイデア出しをするルームです。';
  if (room.slug === 'casual') return '趣味や日常をゆるく話すルームです。';
  return room.description;
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
    <PageShell description={<>雑談やアイデア出しから、小さな企画の種を見つけられます。<br />会話が盛り上がったら、募集ボードにつなげられます。</>} eyebrow="Rooms" title="ルーム">
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.3rem] bg-theme-card/84 p-4 backdrop-blur">
          <Badge className="bg-theme-main text-white"><Sparkles size={13} />会話とアイデア出しの場所</Badge>
          <p className="mt-2 text-sm leading-6 text-theme-muted">2つのルームから、気軽に会話を始められます。</p>
        </div>
      </Card>

      {!canUseSupabaseRooms ? (
        <Card className="space-y-2">
          <Badge>ローカルデモ</Badge>
          <p className="text-sm font-bold text-theme-text">ログインするとルームで会話できます。</p>
          <p className="text-sm leading-6 text-theme-muted">ログイン前でも、公式2ルームの一覧を確認できます。</p>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
      {loading ? <Card className="text-sm font-bold text-theme-muted">ルームを読み込んでいます...</Card> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => {
          const { Icon, className } = getRoomVisual(room);

          return (
            <Card className="flex h-full flex-col gap-3 p-3" key={room.slug}>
              <div className="flex items-start gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ${className}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-black leading-tight text-theme-text">{room.name}</h2>
                    <Badge className="bg-theme-card shadow-sm"><UsersRound size={13} />{room.message_count}件</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-theme-muted">{getRoomShortDescription(room)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">{(roomTags[room.slug] ?? ['公式']).slice(0, 3).map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/60 pt-3 text-xs font-bold text-theme-muted">
                <span>{formatLatest(room.latest_message_at)}</span>
                <Link className="shrink-0" to={`/rooms/${room.slug}`}><Button className="min-h-10 px-4" type="button">入る<ArrowRight size={15} /></Button></Link>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
