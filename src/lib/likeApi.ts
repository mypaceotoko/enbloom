import type { Like, LikeWithProfile } from '../types/like';
import { isSchemaRelationshipError } from './dbError';
import { getSafeErrorLog } from './errorMessage';
import { createMatchIfMutualLike } from './matchApi';
import { attachPrimaryPhotoUrls, getPrimaryProfilePhotos } from './profilePhotoApi';
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
const profileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,account_status,invited_by,invite_code_used';
const profileColumnsWithoutAccountStatus = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const likeWithProfilesColumns = [
  likeColumns,
  `sender_profile:profiles!likes_from_user_id_fkey(${profileColumns})`,
  `receiver_profile:profiles!likes_to_user_id_fkey(${profileColumns})`,
].join(',');
const likeWithProfilesFallbackColumns = [
  likeColumns,
  `sender_profile:profiles!likes_from_user_id_fkey(${profileColumnsWithoutAccountStatus})`,
  `receiver_profile:profiles!likes_to_user_id_fkey(${profileColumnsWithoutAccountStatus})`,
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

async function attachPhotosToLikes(likes: LikeWithProfile[]): Promise<LikeWithProfile[]> {
  const profiles = likes.map((like) => like.profile).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const photosByUserId = await getPrimaryProfilePhotos(profiles.map((profile) => profile.id));
  const profilesWithPhotos = attachPrimaryPhotoUrls(profiles, photosByUserId);
  const profileById = new Map(profilesWithPhotos.map((profile) => [profile.id, profile]));
  return likes.map((like) => ({ ...like, profile: like.profile ? profileById.get(like.profile.id) ?? like.profile : null }));
}

async function getLikesWithProfileFallback(userId: string, direction: 'sent' | 'received'): Promise<LikeWithProfile[]> {
  const filterColumn = direction === 'sent' ? 'from_user_id' : 'to_user_id';
  const phase = direction === 'sent' ? 'sent_likes_fetch' : 'received_likes_fetch';
  const client = requireSupabaseClient();
  const primaryResult = await client
    .from('likes')
    .select(likeWithProfilesColumns)
    .eq(filterColumn, userId)
    .order('created_at', { ascending: false });

  if (!primaryResult.error) {
    console.info(`[ConnectBloom] ${direction} likes count`, { count: primaryResult.data?.length ?? 0 });
    return attachPhotosToLikes((primaryResult.data ?? []).map((row) => mapLikeWithProfile(row as unknown as LikeRowWithProfiles, direction)));
  }

  console.warn('[ConnectBloom] likes fetch failed', getSafeErrorLog(primaryResult.error, phase));
  if (!isSchemaRelationshipError(primaryResult.error)) throw primaryResult.error;

  const fallbackWithProfiles = await client
    .from('likes')
    .select(likeWithProfilesFallbackColumns)
    .eq(filterColumn, userId)
    .order('created_at', { ascending: false });

  if (!fallbackWithProfiles.error) {
    console.warn('[ConnectBloom] likes profile fallback used', getSafeErrorLog(primaryResult.error, `${phase}_profile_fallback`));
    return attachPhotosToLikes((fallbackWithProfiles.data ?? []).map((row) => mapLikeWithProfile(row as unknown as LikeRowWithProfiles, direction)));
  }

  console.warn('[ConnectBloom] likes profile fallback failed', getSafeErrorLog(fallbackWithProfiles.error, `${phase}_profile_fallback_failed`));
  if (!isSchemaRelationshipError(fallbackWithProfiles.error)) throw fallbackWithProfiles.error;

  const baseResult = await client
    .from('likes')
    .select(likeColumns)
    .eq(filterColumn, userId)
    .order('created_at', { ascending: false });

  if (baseResult.error) {
    console.warn('[ConnectBloom] likes base fallback failed', getSafeErrorLog(baseResult.error, `${phase}_base_fallback_failed`));
    throw baseResult.error;
  }

  console.warn('[ConnectBloom] likes base fallback used', getSafeErrorLog(fallbackWithProfiles.error, `${phase}_base_fallback`));
  return (baseResult.data ?? []).map((row) => ({ ...mapLikeRow(row as LikeRow), direction, profile: null }));
}

export async function getSentLikes(userId: string): Promise<LikeWithProfile[]> {
  return getLikesWithProfileFallback(userId, 'sent');
}

export async function getReceivedLikes(userId: string): Promise<LikeWithProfile[]> {
  return getLikesWithProfileFallback(userId, 'received');
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

export async function createLike(receiverId: string): Promise<Like & { matched: boolean; matchId?: string; matchCheckError?: string }> {
  const senderId = await getCurrentUserId();
  console.info('[ConnectBloom] like create started', { receiverIdExists: Boolean(receiverId) });

  if (senderId === receiverId) {
    throw new Error('自分自身には「話してみたい」を送れません。');
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
    console.info('[ConnectBloom] like create success', { success: true, alreadyLiked: true });
    return { ...mapLikeRow(data), matched: false };
  }

  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .insert({ from_user_id: senderId, to_user_id: receiverId })
    .select(likeColumns)
    .single<LikeRow>();

  if (error) {
    console.info('[ConnectBloom] like create success', { success: false });
    throw error;
  }

  console.info('[ConnectBloom] like create success', { success: true });

  try {
    const matchResult = await createMatchIfMutualLike(receiverId);
    return {
      ...mapLikeRow(data),
      matched: matchResult.matched,
      matchId: matchResult.matchId,
    };
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'コネクト確認に失敗しました。';
    console.info('[ConnectBloom] match create success', { success: false });
    console.warn('[ConnectBloom] Like was saved, but match check failed.', message);
    return { ...mapLikeRow(data), matched: false, matchCheckError: '話してみたいは保存しましたが、コネクト確認に失敗しました。' };
  }
}

export async function deleteLike(receiverId: string): Promise<boolean> {
  const senderId = await getCurrentUserId();
  const { error } = await requireSupabaseClient()
    .from('likes')
    .delete()
    .eq('from_user_id', senderId)
    .eq('to_user_id', receiverId);

  const success = !error;
  console.info('[ConnectBloom] like delete success', { success });
  if (error) throw error;
  return true;
}

export async function toggleLike(receiverId: string): Promise<{ liked: boolean; matched: boolean; matchId?: string; matchCheckError?: string; like: Like | null }> {
  const senderId = await getCurrentUserId();
  if (senderId === receiverId) {
    throw new Error('自分自身には「話してみたい」を送れません。');
  }

  const alreadyLiked = await hasLiked(senderId, receiverId);
  if (alreadyLiked) {
    await deleteLike(receiverId);
    return { liked: false, matched: false, like: null };
  }

  const like = await createLike(receiverId);
  return { liked: true, matched: like.matched, matchId: like.matchId, matchCheckError: like.matchCheckError, like };
}

export async function getLikedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabaseClient()
    .from('likes')
    .select('to_user_id')
    .eq('from_user_id', userId);

  if (error) {
    console.warn('[ConnectBloom] sent like ids fetch failed', getSafeErrorLog(error, 'sent_like_ids_fetch'));
    throw error;
  }
  console.info('[ConnectBloom] sent likes count', { count: data?.length ?? 0 });
  return (data ?? []).map((row) => row.to_user_id as string);
}
