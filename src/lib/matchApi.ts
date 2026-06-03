import type { DirectConversationResult, Match, MatchCreateResult, MatchStatus, MatchWithProfile } from '../types/match';
import { attachPrimaryPhotoUrls, getPrimaryProfilePhotos } from './profilePhotoApi';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { requireSupabaseClient } from './supabase';

type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: MatchStatus;
  created_at: string;
  last_message_at: string | null;
};

type MatchRowWithProfiles = MatchRow & {
  user1_profile?: ProfileRow | ProfileRow[] | null;
  user2_profile?: ProfileRow | ProfileRow[] | null;
};

type MatchRpcRow = {
  success?: boolean;
  matched?: boolean;
  match_id?: string | null;
  already_exists?: boolean;
  message?: string | null;
};

type DirectConversationRpcRow = {
  success?: boolean;
  match_id?: string | null;
  already_exists?: boolean;
  blocked?: boolean;
  message?: string | null;
};

const matchColumns = 'id,user1_id,user2_id,status,created_at,last_message_at';
const profileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const matchWithProfilesColumns = [
  matchColumns,
  `user1_profile:profiles!matches_user1_id_fkey(${profileColumns})`,
  `user2_profile:profiles!matches_user2_id_fkey(${profileColumns})`,
].join(',');

function mapMatchRow(row: MatchRow): Match {
  return {
    id: row.id,
    user1_id: row.user1_id,
    user2_id: row.user2_id,
    status: row.status,
    created_at: row.created_at,
    last_message_at: row.last_message_at,
  };
}

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function mapMatchWithProfile(row: MatchRowWithProfiles, currentUserId: string): MatchWithProfile {
  const otherUserId = row.user1_id === currentUserId ? row.user2_id : row.user1_id;
  const otherProfile = row.user1_id === currentUserId ? firstProfile(row.user2_profile) : firstProfile(row.user1_profile);

  return {
    ...mapMatchRow(row),
    otherUserId,
    profile: otherProfile ? profileRowToUserProfile(otherProfile) : null,
  };
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

async function hasProfile(profileId: string) {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return Boolean(data);
}

async function hasReciprocalLikes(userAId: string, userBId: string) {
  const [{ data: forwardLike, error: forwardError }, { data: reverseLike, error: reverseError }] = await Promise.all([
    requireSupabaseClient()
      .from('likes')
      .select('id')
      .eq('from_user_id', userAId)
      .eq('to_user_id', userBId)
      .maybeSingle<{ id: string }>(),
    requireSupabaseClient()
      .from('likes')
      .select('id')
      .eq('from_user_id', userBId)
      .eq('to_user_id', userAId)
      .maybeSingle<{ id: string }>(),
  ]);

  if (forwardError) throw forwardError;
  if (reverseError) throw reverseError;

  return Boolean(forwardLike && reverseLike);
}

function mapRpcResult(row: MatchRpcRow | null | undefined): MatchCreateResult {
  return {
    success: Boolean(row?.success),
    matched: Boolean(row?.matched),
    matchId: row?.match_id ?? undefined,
    alreadyExists: Boolean(row?.already_exists),
    message: row?.message ?? undefined,
  };
}


function mapDirectConversationResult(row: DirectConversationRpcRow | null | undefined): DirectConversationResult {
  return {
    success: Boolean(row?.success),
    matchId: row?.match_id ?? undefined,
    alreadyExists: Boolean(row?.already_exists),
    blocked: Boolean(row?.blocked),
    message: row?.message ?? undefined,
  };
}

function mapDirectConversationError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (/block|blocked|ブロック/i.test(error.message)) return 'ブロック中のため会話を開始できません。';
    if (/auth|login|ログイン/i.test(error.message)) return 'ログイン状態を確認できませんでした。';
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === '42883' || /function .*create_match_if_mutual_like/i.test(error.message ?? '');
}

export async function getMyMatches(userId: string): Promise<MatchWithProfile[]> {
  const { data, error } = await requireSupabaseClient()
    .from('matches')
    .select(matchWithProfilesColumns)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  console.info('[ConnectBloom] my matches count', { count: data?.length ?? 0 });
  const matches = (data ?? []).map((row) => mapMatchWithProfile(row as unknown as MatchRowWithProfiles, userId));
  const profiles = matches.map((match) => match.profile).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const photosByUserId = await getPrimaryProfilePhotos(profiles.map((profile) => profile.id));
  const profilesWithPhotos = attachPrimaryPhotoUrls(profiles, photosByUserId);
  const profileById = new Map(profilesWithPhotos.map((profile) => [profile.id, profile]));
  return matches.map((match) => ({ ...match, profile: match.profile ? profileById.get(match.profile.id) ?? match.profile : null }));
}

export async function hasMatched(userAId: string, userBId: string): Promise<boolean> {
  if (userAId === userBId) return false;

  const { data, error } = await requireSupabaseClient()
    .from('matches')
    .select('id')
    .or(`and(user1_id.eq.${userAId},user2_id.eq.${userBId}),and(user1_id.eq.${userBId},user2_id.eq.${userAId})`)
    .eq('status', 'active')
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  const matched = Boolean(data);
  console.info('[ConnectBloom] match already exists', { exists: matched });
  return matched;
}

export async function createMatch(userAId: string, userBId: string): Promise<MatchCreateResult> {
  if (userAId === userBId) {
    return { success: false, matched: false, message: '自分自身とはコネクトできません。' };
  }

  const mutualLikeExists = await hasReciprocalLikes(userAId, userBId);
  console.info('[ConnectBloom] mutual like exists', { exists: mutualLikeExists });
  if (!mutualLikeExists) {
    return { success: true, matched: false, message: '相互の「話してみたい」はまだ成立していません。' };
  }

  const existingMatch = await hasMatched(userAId, userBId);
  if (existingMatch) {
    const { data, error } = await requireSupabaseClient()
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${userAId},user2_id.eq.${userBId}),and(user1_id.eq.${userBId},user2_id.eq.${userAId})`)
      .eq('status', 'active')
      .single<{ id: string }>();

    if (error) throw error;
    return { success: true, matched: true, matchId: data.id, alreadyExists: true, message: 'すでにご縁がつながっています。' };
  }

  const { data, error } = await requireSupabaseClient()
    .from('matches')
    .insert({ user1_id: userAId, user2_id: userBId })
    .select('id')
    .single<{ id: string }>();

  const success = !error;
  console.info('[ConnectBloom] match create success', { success });
  if (error) throw error;

  return { success: true, matched: true, matchId: data.id, alreadyExists: false, message: 'ご縁がつながりました。' };
}

export async function createMatchIfMutualLike(targetUserId: string): Promise<MatchCreateResult> {
  const currentUserId = await getCurrentUserId();
  console.info('[ConnectBloom] match check started', { targetUserIdExists: Boolean(targetUserId) });

  if (currentUserId === targetUserId) {
    return { success: false, matched: false, message: '自分自身とはコネクトできません。' };
  }

  const targetExists = await hasProfile(targetUserId);
  console.info('[ConnectBloom] targetUserId exists', { exists: targetExists });
  if (!targetExists) {
    return { success: false, matched: false, message: '相手のプロフィールを確認できませんでした。' };
  }

  const { data, error } = await requireSupabaseClient()
    .rpc('create_match_if_mutual_like', { target_user_id: targetUserId });

  if (!error) {
    const rpcRow = Array.isArray(data) ? data[0] : data;
    const result = mapRpcResult(rpcRow as MatchRpcRow | null | undefined);
    console.info('[ConnectBloom] mutual like exists', { exists: result.matched });
    console.info('[ConnectBloom] match already exists', { exists: Boolean(result.alreadyExists) });
    console.info('[ConnectBloom] match create success', { success: result.success });
    return result;
  }

  if (!isMissingRpcError(error)) {
    console.info('[ConnectBloom] match create success', { success: false });
    throw error;
  }

  const mutualLikeExists = await hasReciprocalLikes(currentUserId, targetUserId);
  console.info('[ConnectBloom] mutual like exists', { exists: mutualLikeExists });

  if (!mutualLikeExists) {
    return { success: true, matched: false, message: '相互の「話してみたい」はまだ成立していません。' };
  }

  return createMatch(currentUserId, targetUserId);
}

export async function getMatchedUserIds(userId: string): Promise<string[]> {
  const matches = await getMyMatches(userId);
  return matches.map((match) => match.otherUserId);
}


export async function getOrCreateMatchForUsers(userAId: string, userBId: string): Promise<DirectConversationResult> {
  const currentUserId = await getCurrentUserId();
  const targetUserId = currentUserId === userAId ? userBId : userAId;

  if (!targetUserId || targetUserId === currentUserId || (currentUserId !== userAId && currentUserId !== userBId)) {
    return { success: false, message: '会話の相手を確認できませんでした。' };
  }

  const { data, error } = await requireSupabaseClient()
    .rpc('ensure_direct_conversation', { target_user_id: targetUserId });

  if (error) {
    console.info('[ConnectBloom] direct conversation ensure success', { success: false });
    return { success: false, message: mapDirectConversationError(error, '会話の作成に失敗しました') };
  }

  const result = mapDirectConversationResult(Array.isArray(data) ? data[0] : data);
  console.info('[ConnectBloom] direct conversation ensure success', { success: result.success, alreadyExists: result.alreadyExists, blocked: result.blocked });
  return result;
}

export async function ensureDirectConversation(userAId: string, userBId: string): Promise<DirectConversationResult> {
  return getOrCreateMatchForUsers(userAId, userBId);
}

export async function ensureConversationForActivityInterest(postId: string, interestId: string): Promise<DirectConversationResult> {
  const { data, error } = await requireSupabaseClient()
    .rpc('ensure_activity_interest_match', { target_post_id: postId, target_interest_id: interestId });

  if (error) {
    console.info('[ConnectBloom] activity conversation ensure success', { success: false });
    return { success: false, message: mapDirectConversationError(error, '会話の作成に失敗しました') };
  }

  const result = mapDirectConversationResult(Array.isArray(data) ? data[0] : data);
  console.info('[ConnectBloom] activity conversation ensure success', { success: result.success, alreadyExists: result.alreadyExists, blocked: result.blocked });
  return result;
}

export async function getConversationPathForUser(targetUserId: string, postId?: string): Promise<string> {
  const currentUserId = await getCurrentUserId();
  const result = await ensureDirectConversation(currentUserId, targetUserId);

  if (!result.success || !result.matchId) {
    throw new Error(result.message ?? (result.blocked ? 'ブロック中のため会話を開始できません。' : '会話への移動に失敗しました。'));
  }

  const query = postId ? `?postId=${encodeURIComponent(postId)}` : '';
  return `/messages/${result.matchId}${query}`;
}
