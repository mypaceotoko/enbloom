import { ArrowRight, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { demoChatRooms, roomTags } from '../data/mockChatRooms';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getChatRooms } from '../lib/chatRoomApi';
import { getSafeErrorLog } from '../lib/errorMessage';
import { getRoomVisual } from '../lib/roomVisual';
import type { ChatRoomWithStats } from '../types/chatRoom';
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

function getRoomShortDescriptionKey(slug: string): TranslationKey | null {
  if (slug === 'creative') return 'rooms.short.creative';
  if (slug === 'casual') return 'rooms.short.casual';
  return null;
}

export function RoomsPage() {
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const { language, t } = useLanguage();
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
          console.warn('[ConnectBloom] rooms load failed', getSafeErrorLog(caughtError, 'rooms_load_failed'));
          setRooms(demoChatRooms);
          setNotice('ルームの読み込みに失敗しました。デモ表示に切り替えました。');
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

  function formatLatest(value: string | null) {
    if (!value) return t('rooms.latestEmpty');
    const locale = language === 'en' ? 'en-US' : 'ja-JP';
    const formattedDate = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    return language === 'en' ? `Latest ${formattedDate}` : `最新 ${formattedDate}`;
  }

  function getRoomDisplayName(room: ChatRoomWithStats) {
    const key = getRoomNameKey(room.slug);
    return key ? t(key) : room.name;
  }

  function getRoomShortDescription(room: ChatRoomWithStats) {
    const key = getRoomShortDescriptionKey(room.slug);
    return key ? t(key) : room.description;
  }

  function getRoomTag(tag: string) {
    const key = roomTagTranslationKeys[tag];
    return key ? t(key) : tag;
  }

  return (
    <PageShell description={<>{t('rooms.description1')}<br />{t('rooms.description2')}</>} eyebrow="Rooms" title={t('rooms.title')}>
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.3rem] bg-theme-card/84 p-4 backdrop-blur">
          <Badge className="bg-theme-main text-white"><Sparkles size={13} />{t('rooms.place')}</Badge>
          <p className="mt-2 text-sm leading-6 text-theme-muted">{t('rooms.intro')}</p>
        </div>
      </Card>

      {!canUseSupabaseRooms ? (
        <Card className="space-y-2">
          <Badge>デモ表示</Badge>
          <p className="text-sm font-bold text-theme-text">{t('rooms.login')}</p>
          <p className="text-sm leading-6 text-theme-muted">{t('rooms.beforeLogin')}</p>
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
                    <h2 className="text-lg font-black leading-tight text-theme-text">{getRoomDisplayName(room)}</h2>
                    <Badge className="bg-theme-card shadow-sm"><UsersRound size={13} />{room.message_count}件</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-theme-muted">{getRoomShortDescription(room)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">{(roomTags[room.slug] ?? ['公式']).slice(0, 3).map((tag) => <Badge key={tag}>#{getRoomTag(tag)}</Badge>)}</div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/60 pt-3 text-xs font-bold text-theme-muted">
                <span>{formatLatest(room.latest_message_at)}</span>
                <Link className="shrink-0" to={`/rooms/${room.slug}`}><Button className="min-h-10 px-4" type="button">{t('rooms.enter')}<ArrowRight size={15} /></Button></Link>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
