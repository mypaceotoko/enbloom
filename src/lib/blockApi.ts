import type { Block, BlockInsertResult } from '../types/block';
import { isSupabaseConfigured, requireSupabaseClient, supabase } from './supabase';

const localAppStateKey = 'enbloom.appState.v1';
const blockColumns = 'id,blocker_id,blocked_id,created_at';

type BlockRow = Block;

function readLocalBlockedUserIds() {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(localAppStateKey);
    if (!rawValue) return [];
    const parsedValue = JSON.parse(rawValue) as { blockedUserIds?: unknown };
    return Array.isArray(parsedValue.blockedUserIds)
      ? parsedValue.blockedUserIds.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

export async function getBlockedUserIds(userId?: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) {
    const localIds = readLocalBlockedUserIds();
    console.info('[EnBloom] blocked ids count', { count: localIds.length });
    return localIds;
  }

  const currentUserId = userId ?? await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', currentUserId);

  if (error) throw error;
  const blockedIds = (data ?? []).map((row) => row.blocked_id as string);
  console.info('[EnBloom] blocked ids count', { count: blockedIds.length });
  return blockedIds;
}

export async function getSafetyHiddenUserIds(userId?: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return getBlockedUserIds(userId);

  const currentUserId = userId ?? await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .select('blocker_id,blocked_id')
    .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

  if (error) {
    const blockedIds = await getBlockedUserIds(currentUserId);
    console.info('[EnBloom] blocked ids count', { count: blockedIds.length });
    return blockedIds;
  }

  const hiddenIds = new Set<string>();
  (data ?? []).forEach((row) => {
    const blockerId = row.blocker_id as string;
    const blockedId = row.blocked_id as string;
    hiddenIds.add(blockerId === currentUserId ? blockedId : blockerId);
  });
  hiddenIds.delete(currentUserId);
  console.info('[EnBloom] blocked ids count', { count: hiddenIds.size });
  return [...hiddenIds];
}

export async function hasBlocked(targetUserId: string): Promise<boolean> {
  if (!targetUserId) return false;

  const currentUserId = isSupabaseConfigured && supabase ? await getCurrentUserId() : '';
  if (currentUserId && currentUserId === targetUserId) return false;

  const blockedIds = await getBlockedUserIds(currentUserId || undefined);
  return blockedIds.includes(targetUserId);
}

export async function hasSafetyBlockBetween(targetUserId: string): Promise<boolean> {
  if (!targetUserId) return false;

  if (!isSupabaseConfigured || !supabase) return hasBlocked(targetUserId);

  const currentUserId = await getCurrentUserId();
  if (currentUserId === targetUserId) return false;

  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${currentUserId})`)
    .limit(1);

  if (error) {
    const blocked = await hasBlocked(targetUserId);
    return blocked;
  }

  return Boolean(data?.length);
}

export async function blockUser(targetUserId: string): Promise<BlockInsertResult> {
  console.info('[EnBloom] block user started', { targetUserIdExists: Boolean(targetUserId) });
  const blockerId = await getCurrentUserId();

  if (blockerId === targetUserId) {
    console.info('[EnBloom] block user success', { success: false });
    throw new Error('自分自身はブロックできません。');
  }

  const alreadyBlocked = await hasBlocked(targetUserId);
  if (alreadyBlocked) {
    console.info('[EnBloom] block user success', { success: true });
    return { success: true, alreadyExists: true, block: null };
  }

  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: targetUserId })
    .select(blockColumns)
    .single<BlockRow>();

  const success = !error;
  console.info('[EnBloom] block user success', { success });
  if (error) throw error;

  return { success: true, alreadyExists: false, block: data };
}

export async function unblockUser(targetUserId: string): Promise<boolean> {
  const blockerId = await getCurrentUserId();
  if (blockerId === targetUserId) return false;

  const { error } = await requireSupabaseClient()
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', targetUserId);

  const success = !error;
  console.info('[EnBloom] block user success', { success });
  if (error) throw error;
  return true;
}
