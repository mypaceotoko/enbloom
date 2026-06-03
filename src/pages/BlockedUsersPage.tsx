import { CalendarClock, HeartHandshake, ShieldCheck, ShieldMinus, Sparkles, UserRoundX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getBlockedUsersWithProfiles, unblockUser as unblockSupabaseUser } from '../lib/blockApi';
import type { BlockedUserWithProfile } from '../types/block';
import type { UserProfile } from '../types/user';

type BlockedUserListItem = {
  targetUserId: string;
  createdAt: string;
  profile: UserProfile | null;
};

const unblockConfirmMessage = 'このユーザーのブロックを解除しますか？解除すると、再び一覧やマッチ関連画面に表示される可能性があります。';
const unblockSuccessMessage = 'ブロックを解除しました。';
const unblockErrorMessage = 'ブロック解除に失敗しました。少し時間を置いてもう一度お試しください。';

function formatBlockedAt(value: string) {
  if (!value) return 'デモ状態のため日時は未保存です';

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function supabaseRowsToListItems(rows: BlockedUserWithProfile[]): BlockedUserListItem[] {
  return rows.map((row) => ({
    targetUserId: row.block.blocked_id,
    createdAt: row.block.created_at,
    profile: row.profile,
  }));
}

export function BlockedUsersPage() {
  const { blockedUserIds, unblockUser: unblockDemoUser } = useAppState();
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const useSupabaseBlocks = isSupabaseMode && isAuthenticated;
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserListItem[]>([]);
  const [loading, setLoading] = useState(useSupabaseBlocks);
  const [unblockingUserId, setUnblockingUserId] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const localBlockedUsers = useMemo<BlockedUserListItem[]>(() => blockedUserIds.map((targetUserId) => ({
    targetUserId,
    createdAt: '',
    profile: mockUsers.find((user) => user.id === targetUserId) ?? null,
  })), [blockedUserIds]);

  useEffect(() => {
    let active = true;

    async function loadBlockedUsers() {
      setNotice('');
      setErrorMessage('');

      if (!useSupabaseBlocks) {
        setBlockedUsers(localBlockedUsers);
        setLoading(false);
        console.info('[EnBloom] blocked users count', { count: localBlockedUsers.length });
        return;
      }

      setLoading(true);
      try {
        const rows = await getBlockedUsersWithProfiles();
        if (!active) return;
        setBlockedUsers(supabaseRowsToListItems(rows));
      } catch (caughtError) {
        if (!active) return;
        setErrorMessage(caughtError instanceof Error ? `ブロック中のユーザーを取得できませんでした: ${caughtError.message}` : 'ブロック中のユーザーを取得できませんでした。');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBlockedUsers();

    return () => {
      active = false;
    };
  }, [localBlockedUsers, useSupabaseBlocks]);

  async function handleUnblock(targetUserId: string) {
    console.info('[EnBloom] targetUserId exists', { exists: Boolean(targetUserId) });
    if (!targetUserId) return;

    const confirmed = window.confirm(unblockConfirmMessage);
    if (!confirmed) return;

    setUnblockingUserId(targetUserId);
    setNotice('');
    setErrorMessage('');

    try {
      if (useSupabaseBlocks) {
        await unblockSupabaseUser(targetUserId);
      } else {
        console.info('[EnBloom] unblock user started', { targetUserIdExists: Boolean(targetUserId) });
        unblockDemoUser(targetUserId);
        console.info('[EnBloom] unblock user success', { success: true });
      }

      setBlockedUsers((current) => current.filter((item) => item.targetUserId !== targetUserId));
      setNotice(unblockSuccessMessage);
    } catch {
      setErrorMessage(unblockErrorMessage);
      console.info('[EnBloom] unblock user success', { success: false });
    } finally {
      setUnblockingUserId('');
    }
  }

  return (
    <PageShell
      description="ブロックした相手は、ホーム・探す・いいね・マッチ一覧に表示されません。必要があれば、いつでもブロックを解除できます。"
      eyebrow="Safety"
      title="ブロック中のユーザー"
    >
      <Card className="flower-gradient border-0 p-1 shadow-lg shadow-theme-main/10">
        <div className="rounded-[1.25rem] bg-theme-card/82 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-main text-white shadow-lg shadow-theme-main/20">
              <ShieldCheck size={20} />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-black text-theme-text">安心のためのブロック管理</p>
              <p className="text-xs leading-5 text-theme-muted">
                ブロック中の相手を確認し、落ち着いて解除できます。解除後は、再読み込みや画面遷移のあとに一覧へ戻る可能性があります。
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!useSupabaseBlocks ? (
        <div className="rounded-full border border-theme-main/15 bg-theme-card/80 px-3 py-1.5 text-center text-[11px] font-black text-theme-main-dark shadow-sm">
          ローカルデモ / Supabase未ログイン
        </div>
      ) : null}

      {notice ? <div className="rounded-[1.15rem] bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
      {errorMessage ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{errorMessage}</div> : null}

      {loading ? (
        <Card className="bg-theme-card/86 py-6 text-center text-sm font-bold text-theme-muted">
          ブロック中のユーザーを確認しています...
        </Card>
      ) : blockedUsers.length === 0 ? (
        <Card className="space-y-3 bg-theme-card/86 py-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
            <HeartHandshake size={22} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-black text-theme-text">現在ブロック中のユーザーはいません。</p>
            <p className="text-xs leading-5 text-theme-muted">安心して使えるよう、必要なときだけブロック機能をご利用ください。</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {blockedUsers.map((item) => (
            <BlockedUserCard
              item={item}
              key={item.targetUserId}
              onUnblock={handleUnblock}
              unblocking={unblockingUserId === item.targetUserId}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function BlockedUserCard({
  item,
  onUnblock,
  unblocking,
}: {
  item: BlockedUserListItem;
  onUnblock: (targetUserId: string) => void;
  unblocking: boolean;
}) {
  const profile = item.profile;
  const displayName = profile?.name || 'EnBloomユーザー';
  const profileSummary = [profile?.age ? `${profile.age}歳` : null, profile?.location || '地域未設定']
    .filter(Boolean)
    .join(' / ');

  return (
    <Card className="space-y-3 border-white/40 bg-theme-card/88 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${profile?.gradient ?? 'from-pink-100 via-rose-50 to-emerald-100'} text-theme-main-dark shadow-inner`}>
          <UserRoundX size={24} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-theme-text">{displayName}</p>
            <p className="mt-0.5 text-xs font-bold text-theme-muted">{profileSummary}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile?.datingTemperature ? <Badge className="bg-theme-main/10 text-theme-main-dark"><Sparkles />{profile.datingTemperature}</Badge> : null}
            {(profile?.interests ?? []).slice(0, 4).map((interest) => <Badge key={interest}>{interest}</Badge>)}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-theme-muted">
            <CalendarClock size={13} />
            ブロック日時: {formatBlockedAt(item.createdAt)}
          </p>
        </div>
      </div>
      <Button className="w-full" disabled={unblocking} onClick={() => onUnblock(item.targetUserId)} variant="secondary">
        <ShieldMinus size={16} />
        {unblocking ? '解除しています...' : 'ブロック解除'}
      </Button>
    </Card>
  );
}
