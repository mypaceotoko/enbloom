import type { Block, BlockInsertResult, BlockedUserWithProfile } from '../types/block';
import { attachPrimaryPhotoUrls, getPrimaryProfilePhotos } from './profilePhotoApi';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { isSupabaseConfigured, requireSupabaseClient, supabase } from './supabase';

const localAppStateKey = 'connectbloom.appState.v1';
const legacyStoragePrefix = 'en' + 'bloom';
const legacyLocalAppStateKey = `${legacyStoragePrefix}.appState.v1`;
const blockColumns = 'id,blocker_id,blocked_id,created_at';
const blockedProfileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,account_status,invited_by,invite_code_used';

type BlockRow = Block;
type BlockedUserProfileJoinRow = BlockRow & {
  blocked_profile?: ProfileRow | ProfileRow[] | null;
};

function readLocalBlockedUserIds() {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(localAppStateKey) ?? window.localStorage.getItem(legacyLocalAppStateKey);
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

function getJoinedProfile(profile: BlockedUserProfileJoinRow['blocked_profile']) {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function blockRowToBlockedUser(row: BlockedUserProfileJoinRow): BlockedUserWithProfile {
  const profile = getJoinedProfile(row.blocked_profile);

  return {
    block: {
      id: row.id,
      blocker_id: row.blocker_id,
      blocked_id: row.blocked_id,
      created_at: row.created_at,
    },
    profile: profile ? profileRowToUserProfile(profile) : null,
  };
}

export async function getBlockedUserIds(userId?: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) {
    const localIds = readLocalBlockedUserIds();
    console.info('[ConnectBloom] blocked ids count', { count: localIds.length });
    return localIds;
  }

  const currentUserId = userId ?? await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', currentUserId);

  if (error) throw error;
  const blockedIds = (data ?? []).map((row) => row.blocked_id as string);
  console.info('[ConnectBloom] blocked ids count', { count: blockedIds.length });
  return blockedIds;
}

export async function getBlockedUsers(userId?: string): Promise<Block[]> {
  console.info('[ConnectBloom] blocked users fetch started');

  if (!isSupabaseConfigured || !supabase) {
    const localBlocks = readLocalBlockedUserIds().map((blockedId) => ({
      id: `local-${blockedId}`,
      blocker_id: 'current-user',
      blocked_id: blockedId,
      created_at: '',
    }));
    console.info('[ConnectBloom] blocked users count', { count: localBlocks.length });
    return localBlocks;
  }

  const currentUserId = userId ?? await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .select(blockColumns)
    .eq('blocker_id', currentUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const blocks = (data ?? []) as unknown as Block[];
  console.info('[ConnectBloom] blocked users count', { count: blocks.length });
  return blocks;
}

export async function getBlockedUsersWithProfiles(userId?: string): Promise<BlockedUserWithProfile[]> {
  console.info('[ConnectBloom] blocked users fetch started');

  if (!isSupabaseConfigured || !supabase) {
    const localBlocks = await getBlockedUsers(userId);
    return localBlocks.map((block) => ({ block, profile: null }));
  }

  const currentUserId = userId ?? await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .select(`${blockColumns},blocked_profile:profiles!blocks_blocked_id_fkey(${blockedProfileColumns})`)
    .eq('blocker_id', currentUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const blockedUsers = ((data ?? []) as unknown as BlockedUserProfileJoinRow[]).map(blockRowToBlockedUser);
  const profiles = blockedUsers.map((item) => item.profile).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const photosByUserId = await getPrimaryProfilePhotos(profiles.map((profile) => profile.id));
  const profilesWithPhotos = attachPrimaryPhotoUrls(profiles, photosByUserId);
  const profileById = new Map(profilesWithPhotos.map((profile) => [profile.id, profile]));
  console.info('[ConnectBloom] blocked users count', { count: blockedUsers.length });
  return blockedUsers.map((item) => ({ ...item, profile: item.profile ? profileById.get(item.profile.id) ?? item.profile : null }));
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
    console.info('[ConnectBloom] blocked ids count', { count: blockedIds.length });
    return blockedIds;
  }

  const hiddenIds = new Set<string>();
  (data ?? []).forEach((row) => {
    const blockerId = row.blocker_id as string;
    const blockedId = row.blocked_id as string;
    hiddenIds.add(blockerId === currentUserId ? blockedId : blockerId);
  });
  hiddenIds.delete(currentUserId);
  console.info('[ConnectBloom] blocked ids count', { count: hiddenIds.size });
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
  console.info('[ConnectBloom] block user started', { targetUserIdExists: Boolean(targetUserId) });
  const blockerId = await getCurrentUserId();

  if (blockerId === targetUserId) {
    console.info('[ConnectBloom] block user success', { success: false });
    throw new Error('自分自身はブロックできません。');
  }

  const alreadyBlocked = await hasBlocked(targetUserId);
  if (alreadyBlocked) {
    console.info('[ConnectBloom] block user success', { success: true });
    return { success: true, alreadyExists: true, block: null };
  }

  const { data, error } = await requireSupabaseClient()
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: targetUserId })
    .select(blockColumns)
    .single<BlockRow>();

  const success = !error;
  console.info('[ConnectBloom] block user success', { success });
  if (error) throw error;

  return { success: true, alreadyExists: false, block: data };
}

export async function unblockUser(targetUserId: string): Promise<boolean> {
  console.info('[ConnectBloom] unblock user started', { targetUserIdExists: Boolean(targetUserId) });
  const blockerId = await getCurrentUserId();
  if (blockerId === targetUserId) {
    console.info('[ConnectBloom] unblock user success', { success: false });
    return false;
  }

  const { error } = await requireSupabaseClient()
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', targetUserId);

  const success = !error;
  console.info('[ConnectBloom] unblock user success', { success });
  if (error) throw error;
  return true;
}
