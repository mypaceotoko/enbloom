import type { DirectConversationResult, Match, MatchCreateResult, MatchStatus, MatchWithProfile } from '../types/match';
import { isSchemaRelationshipError } from './dbError';
import { attachPrimaryPhotoUrls, getPrimaryProfilePhotos } from './profilePhotoApi';
import { getPublicProfileById, profileRowToUserProfile, type ProfileRow } from './profileApi';
import { getErrorDebugInfo, getSafeErrorLog, getShortErrorMessage } from './errorMessage';
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
  phase?: string | null;
  message?: string | null;
};

type DirectConversationRpcRow = {
  success?: boolean;
  match_id?: string | null;
  matchId?: string | null;
  id?: string | null;
  already_exists?: boolean;
  alreadyExists?: boolean;
  blocked?: boolean;
  phase?: string | null;
  message?: string | null;
};

type SupabaseErrorDetails = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

type ActivityInterestConversationParams = {
  postId: string;
  interestId: string;
  targetUserId?: string | null;
};

type ActivityInterestConversationPathResult = DirectConversationResult & {
  path?: string;
};

const matchColumns = 'id,user1_id,user2_id,status,created_at,last_message_at';
const profileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,account_status,invited_by,invite_code_used';
const profileColumnsWithoutAccountStatus = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const matchWithProfilesColumns = [
  matchColumns,
  `user1_profile:profiles!matches_user1_id_fkey(${profileColumns})`,
  `user2_profile:profiles!matches_user2_id_fkey(${profileColumns})`,
].join(',');
const matchWithProfilesFallbackColumns = [
  matchColumns,
  `user1_profile:profiles!matches_user1_id_fkey(${profileColumnsWithoutAccountStatus})`,
  `user2_profile:profiles!matches_user2_id_fkey(${profileColumnsWithoutAccountStatus})`,
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


const resolveMatchId = (data: unknown): string | null => {
  if (typeof data === 'string' && data.length > 0) return data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as DirectConversationRpcRow | string | null | undefined;
    if (typeof first === 'string') return first;
    return first?.match_id ?? first?.matchId ?? first?.id ?? null;
  }
  if (data && typeof data === 'object') {
    const obj = data as DirectConversationRpcRow;
    return obj.match_id ?? obj.matchId ?? obj.id ?? null;
  }
  return null;
};

function safeStringifyRpcData(data: unknown) {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function mapDirectConversationResult(data: unknown): DirectConversationResult {
  const row = Array.isArray(data) ? data[0] : data;
  const objectRow = row && typeof row === 'object' ? row as DirectConversationRpcRow : null;
  const matchId = resolveMatchId(data) ?? undefined;

  return {
    success: objectRow?.success ?? Boolean(matchId),
    matchId,
    alreadyExists: Boolean(objectRow?.already_exists ?? objectRow?.alreadyExists),
    blocked: Boolean(objectRow?.blocked),
    phase: objectRow?.phase ?? undefined,
    message: objectRow?.message ?? undefined,
  };
}

function getSupabaseErrorDetails(error: unknown): SupabaseErrorDetails {
  if (!error || typeof error !== 'object') {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  const maybeError = error as SupabaseErrorDetails;
  return {
    message: maybeError.message,
    details: maybeError.details,
    hint: maybeError.hint,
    code: maybeError.code,
  };
}

export function formatSupabaseDebugError(error: unknown) {
  const details = getSupabaseErrorDetails(error);
  return [
    `message: ${details.message ?? 'unknown'}`,
    `details: ${details.details ?? 'none'}`,
    `hint: ${details.hint ?? 'none'}`,
    `code: ${details.code ?? 'none'}`,
  ].join(' / ');
}

export function formatConversationFailureMessage(_phase: string, message: string, debugError?: string) {
  void debugError;
  return /ブロック/.test(message || '')
    ? 'ブロック中のため会話を開始できません。'
    : '会話の作成に失敗しました。時間を置いてもう一度お試しください。';
}

export function formatConversationFailureDebugInfo(phase: string, debugError?: string) {
  return [getErrorDebugInfo({ phase }), debugError].filter(Boolean).join(' / ');
}

function logDmSupabaseError(phase: string, error: unknown) {
  const details = getSupabaseErrorDetails(error);
  console.error('[DM] supabase error', getSafeErrorLog(details, phase));
}

function mapDirectConversationError(error: unknown, fallback: string) {
  const details = getSupabaseErrorDetails(error);
  const message = details.message ?? (error instanceof Error ? error.message : '');
  const friendlyMessage = (() => {
    if (/block|blocked|ブロック/i.test(message)) return 'ブロック中のため会話を開始できません。';
    if (/auth|login|ログイン/i.test(message)) return 'ログイン状態を確認できませんでした。';
    return message ? fallback : fallback;
  })();

  return getShortErrorMessage(error, friendlyMessage);
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === '42883' || /function .*create_match_if_mutual_like/i.test(error.message ?? '');
}

async function attachPhotosToMatches(matches: MatchWithProfile[]): Promise<MatchWithProfile[]> {
  const profiles = matches.map((match) => match.profile).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const photosByUserId = await getPrimaryProfilePhotos(profiles.map((profile) => profile.id));
  const profilesWithPhotos = attachPrimaryPhotoUrls(profiles, photosByUserId);
  const profileById = new Map(profilesWithPhotos.map((profile) => [profile.id, profile]));
  return matches.map((match) => ({ ...match, profile: match.profile ? profileById.get(match.profile.id) ?? match.profile : null }));
}

async function getMatchesWithBaseColumns(userId: string): Promise<MatchWithProfile[]> {
  const { data, error } = await requireSupabaseClient()
    .from('matches')
    .select(matchColumns)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ConnectBloom] matches base fallback failed', getSafeErrorLog(error, 'matches_base_fallback_failed'));
    throw error;
  }

  const baseMatches = ((data ?? []) as MatchRow[]).map((row) => ({
    ...mapMatchRow(row),
    otherUserId: row.user1_id === userId ? row.user2_id : row.user1_id,
    profile: null,
  }));

  const matchesWithProfiles = await Promise.all(baseMatches.map(async (match) => {
    try {
      const profile = await getPublicProfileById(match.otherUserId);
      return { ...match, profile: profile ? profileRowToUserProfile(profile) : null };
    } catch (caughtError) {
      console.warn('[ConnectBloom] match profile fallback fetch failed', getSafeErrorLog(caughtError, 'match_profile_fallback_fetch_failed'));
      return match;
    }
  }));

  return attachPhotosToMatches(matchesWithProfiles);
}

export async function getMyMatches(userId: string): Promise<MatchWithProfile[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('matches')
    .select(matchWithProfilesColumns)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (!error) {
    console.info('[ConnectBloom] my matches count', { count: data?.length ?? 0 });
    return attachPhotosToMatches((data ?? []).map((row) => mapMatchWithProfile(row as unknown as MatchRowWithProfiles, userId)));
  }

  console.warn('[ConnectBloom] matches fetch failed', getSafeErrorLog(error, 'matches_fetch'));
  if (!isSchemaRelationshipError(error)) throw error;

  const fallbackWithProfiles = await client
    .from('matches')
    .select(matchWithProfilesFallbackColumns)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (!fallbackWithProfiles.error) {
    console.warn('[ConnectBloom] matches profile fallback used', getSafeErrorLog(error, 'matches_profile_fallback'));
    return attachPhotosToMatches((fallbackWithProfiles.data ?? []).map((row) => mapMatchWithProfile(row as unknown as MatchRowWithProfiles, userId)));
  }

  console.warn('[ConnectBloom] matches profile fallback failed', getSafeErrorLog(fallbackWithProfiles.error, 'matches_profile_fallback_failed'));
  if (!isSchemaRelationshipError(fallbackWithProfiles.error)) throw fallbackWithProfiles.error;

  console.warn('[ConnectBloom] matches base fallback used', getSafeErrorLog(fallbackWithProfiles.error, 'matches_base_fallback'));
  return getMatchesWithBaseColumns(userId);
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
    console.error('[DM] validation failed', { phase: 'validate-direct-target', userAId, userBId, currentUserId, targetUserId });
    return { success: false, phase: 'validate-direct-target', message: '会話の相手を確認できませんでした。' };
  }

  const { data, error } = await requireSupabaseClient()
    .rpc('ensure_direct_conversation', { target_user_id: targetUserId });
  if (error) {
    logDmSupabaseError('ensure_direct_conversation', error);
    return {
      success: false,
      phase: 'rpc_failed',
      message: mapDirectConversationError(error, '会話の作成に失敗しました'),
      debugError: formatSupabaseDebugError(error),
      errorDetails: getSupabaseErrorDetails(error),
    };
  }

  const result = mapDirectConversationResult(data);
  const phase = result.success && result.matchId ? 'ensure_direct_conversation' : 'match_id_missing';
  const debugError = phase === 'match_id_missing' ? `rpc data: ${safeStringifyRpcData(data)}` : result.debugError;
  return { ...result, phase, debugError };
}

export async function ensureDirectConversation(userAId: string, userBId: string): Promise<DirectConversationResult> {
  return getOrCreateMatchForUsers(userAId, userBId);
}

export async function ensureConversationForActivityInterest(postId: string, interestId: string, targetUserId?: string | null): Promise<DirectConversationResult> {
  void targetUserId;
  const { data, error } = await requireSupabaseClient()
    .rpc('ensure_activity_interest_match', { target_post_id: postId, target_interest_id: interestId });
  if (error) {
    logDmSupabaseError('ensure_activity_interest_match', error);
    return {
      success: false,
      phase: 'rpc_failed',
      message: mapDirectConversationError(error, '会話の作成に失敗しました'),
      debugError: formatSupabaseDebugError(error),
      errorDetails: getSupabaseErrorDetails(error),
    };
  }

  const result = mapDirectConversationResult(data);
  const phase = result.phase ?? (result.success && result.matchId ? 'ensure_activity_interest_match' : 'match_id_missing');
  const debugError = phase === 'match_id_missing' ? `rpc data: ${safeStringifyRpcData(data)}` : result.debugError;
  return { ...result, phase, debugError };
}

export async function getActivityInterestConversationPath({ postId, interestId, targetUserId }: ActivityInterestConversationParams): Promise<ActivityInterestConversationPathResult> {
  const result = await ensureConversationForActivityInterest(postId, interestId, targetUserId);

  if (!result.success || !result.matchId) {
    const phase = result.phase ?? (!result.success ? 'rpc_failed' : 'match_id_missing');
    const message = result.message ?? (result.blocked ? 'ブロック中のため会話を開始できません。' : 'matchIdを取得できませんでした。');
    console.error('[DM] conversation creation failed', {
      phase,
      postId,
      interestId,
      targetUserId,
      result,
    });
    return {
      ...result,
      phase,
      message: formatConversationFailureMessage(phase, message, result.debugError),
    };
  }

  const path = `/messages/${result.matchId}?postId=${encodeURIComponent(postId)}`;
  return { ...result, path };
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
