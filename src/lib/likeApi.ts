import type { Like, LikeWithProfile } from '../types/like';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { requireSupabaseClient } from './supabase';

type LikeRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
};

type LikeRowWithProfiles = LikeRow & {
  sender_profile?: ProfileRow | ProfileRow[] | null;
  receiver_profile?: ProfileRow | ProfileRow[] | null;
};

const likeColumns = 'id,from_user_id,to_user_id,created_at';
const likeWithProfilesColumns = [
  likeColumns,
  'sender_profile:profiles!likes_from_user_id_fkey(id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used)',
  'receiver_profile:profiles!likes_to_user_id_fkey(id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used)',
].join(',');

function mapLikeRow(row: LikeRow): Like {
  return {
    id: row.id,
    sender_id: row.from_user_id,
    receiver_id: row.to_user_id,
    created_at: row.created_at,
  };
}

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function mapLikeWithProfile(row: LikeRowWithProfiles, direction: 'sent' | 'received'): LikeWithProfile {
  const profile = direction === 'sent' ? firstProfile(row.receiver_profile) : firstProfile(row.sender_profile);

  return {
    ...mapLikeRow(row),
    direction,
    profile: profile ? profileRowToUserProfile(profile) : null,
  };
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

export async function getSentLikes(userId: string): Promise<LikeWithProfile[]> {
  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .select(likeWithProfilesColumns)
    .eq('from_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  console.info('[EnBloom] sent likes count', { count: data?.length ?? 0 });
  return (data ?? []).map((row) => mapLikeWithProfile(row as unknown as LikeRowWithProfiles, 'sent'));
}

export async function getReceivedLikes(userId: string): Promise<LikeWithProfile[]> {
  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .select(likeWithProfilesColumns)
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  console.info('[EnBloom] received likes count', { count: data?.length ?? 0 });
  return (data ?? []).map((row) => mapLikeWithProfile(row as unknown as LikeRowWithProfiles, 'received'));
}

export async function hasLiked(senderId: string, receiverId: string): Promise<boolean> {
  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .select('id')
    .eq('from_user_id', senderId)
    .eq('to_user_id', receiverId)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return Boolean(data);
}

export async function createLike(receiverId: string): Promise<Like> {
  const senderId = await getCurrentUserId();
  console.info('[EnBloom] like create started', { receiverIdExists: Boolean(receiverId) });

  if (senderId === receiverId) {
    throw new Error('自分自身にはいいねできません。');
  }

  const alreadyLiked = await hasLiked(senderId, receiverId);
  if (alreadyLiked) {
    const { data, error } = await requireSupabaseClient()
      .from('likes')
      .select(likeColumns)
      .eq('from_user_id', senderId)
      .eq('to_user_id', receiverId)
      .single<LikeRow>();

    if (error) throw error;
    console.info('[EnBloom] like create success', { success: true, alreadyLiked: true });
    return mapLikeRow(data);
  }

  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .insert({ from_user_id: senderId, to_user_id: receiverId })
    .select(likeColumns)
    .single<LikeRow>();

  if (error) {
    console.info('[EnBloom] like create success', { success: false });
    throw error;
  }

  console.info('[EnBloom] like create success', { success: true });
  // TODO: 次フェーズで、逆方向のいいねを検知したら Supabase matches 作成へ進める。
  return mapLikeRow(data);
}

export async function deleteLike(receiverId: string): Promise<boolean> {
  const senderId = await getCurrentUserId();
  const { error } = await requireSupabaseClient()
    .from('likes')
    .delete()
    .eq('from_user_id', senderId)
    .eq('to_user_id', receiverId);

  const success = !error;
  console.info('[EnBloom] like delete success', { success });
  if (error) throw error;
  return true;
}

export async function toggleLike(receiverId: string): Promise<{ liked: boolean; like: Like | null }> {
  const senderId = await getCurrentUserId();
  if (senderId === receiverId) {
    throw new Error('自分自身にはいいねできません。');
  }

  const alreadyLiked = await hasLiked(senderId, receiverId);
  if (alreadyLiked) {
    await deleteLike(receiverId);
    return { liked: false, like: null };
  }

  const like = await createLike(receiverId);
  return { liked: true, like };
}

export async function getLikedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .select('to_user_id')
    .eq('from_user_id', userId);

  if (error) throw error;
  console.info('[EnBloom] sent likes count', { count: data?.length ?? 0 });
  return (data ?? []).map((row) => row.to_user_id as string);
}
