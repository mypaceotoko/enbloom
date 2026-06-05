import type {
  ActivityInterestStatus,
  ActivityPost,
  ActivityPostFilters,
  ActivityPostInput,
  ActivityPostUpdateInput,
  ActivityPostInterest,
  ActivityPostInterestWithProfile,
  ActivityPostStats,
  ActivityPostWithAuthor,
  ActivityPostWithStats,
  MyInterestedActivityPost,
} from '../types/activityBoard';
import { ensureConversationForActivityInterest } from './matchApi';
import { getMyProfile, profileRowToUserProfile, type ProfileRow } from './profileApi';
import { isMissingColumnError, isSchemaRelationshipError } from './dbError';
import { getSafeErrorLog } from './errorMessage';
import { requireSupabaseClient } from './supabase';

type ActivityPostRow = ActivityPost & {
  author?: ProfileRow | ProfileRow[] | null;
};

type ActivityInterestRow = ActivityPostInterest & {
  profile?: ProfileRow | ProfileRow[] | null;
  post?: ActivityPostRow | ActivityPostRow[] | null;
};

type InterestCountRpcRow = {
  post_id: string;
  interest_count: number;
};

const legacyActivityPostColumns = [
  'id',
  'created_by',
  'title',
  'body',
  'category',
  'area',
  'tags',
  'mode',
  'max_participants',
  'scheduled_at',
  'status',
  'created_at',
  'updated_at',
  'closed_at',
].join(',');
const activityPostColumns = `${legacyActivityPostColumns},room_id`;

const legacyProfileSelectColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const profileSelectColumns = `${legacyProfileSelectColumns},account_status`;
const legacyActivityPostWithAuthorColumns = [
  legacyActivityPostColumns,
  `author:profiles!activity_posts_created_by_fkey(${legacyProfileSelectColumns})`,
].join(',');
const activityPostWithAuthorColumns = [
  activityPostColumns,
  `author:profiles!activity_posts_created_by_fkey(${profileSelectColumns})`,
].join(',');

const activityInterestColumns = 'id,post_id,user_id,message,status,created_at,updated_at';
const legacyActivityInterestWithProfileColumns = [
  activityInterestColumns,
  `profile:profiles!activity_post_interests_user_id_fkey(${legacyProfileSelectColumns})`,
].join(',');
const activityInterestWithProfileColumns = [
  activityInterestColumns,
  `profile:profiles!activity_post_interests_user_id_fkey(${profileSelectColumns})`,
].join(',');
const legacyMyInterestedPostColumns = [
  activityInterestColumns,
  `post:activity_posts!activity_post_interests_post_id_fkey(${legacyActivityPostWithAuthorColumns})`,
].join(',');
const myInterestedPostColumns = [
  activityInterestColumns,
  `post:activity_posts!activity_post_interests_post_id_fkey(${activityPostWithAuthorColumns})`,
].join(',');

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function firstPost(post: ActivityPostRow | ActivityPostRow[] | null | undefined): ActivityPostRow | null {
  if (Array.isArray(post)) return post[0] ?? null;
  return post ?? null;
}

function mapInterest(row: ActivityInterestRow): ActivityPostInterestWithProfile {
  const profile = firstProfile(row.profile);

  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    message: row.message,
    status: row.status ?? 'interested',
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile: profile ? profileRowToUserProfile(profile) : null,
  };
}


function buildActivityPostUpdatePayload(input: ActivityPostUpdateInput) {
  const payload: Partial<Pick<ActivityPost, 'title' | 'body' | 'category' | 'area' | 'tags' | 'max_participants' | 'scheduled_at' | 'mode' | 'status' | 'closed_at' | 'room_id'>> = {};

  if (typeof input.title !== 'undefined') payload.title = input.title.trim();
  if (typeof input.body !== 'undefined') payload.body = input.body.trim();
  if (typeof input.category !== 'undefined') payload.category = input.category;

  const hasLocation = typeof input.location !== 'undefined';
  const hasArea = typeof input.area !== 'undefined';
  if (hasLocation || hasArea) {
    const nextArea = hasLocation ? input.location : input.area;
    payload.area = nextArea?.trim() || null;
  }

  if (typeof input.tags !== 'undefined') {
    payload.tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  }

  const hasCapacity = typeof input.capacity !== 'undefined';
  const hasMaxParticipants = typeof input.max_participants !== 'undefined';
  if (hasCapacity || hasMaxParticipants) {
    payload.max_participants = hasCapacity ? input.capacity ?? null : input.max_participants ?? null;
  }

  if (typeof input.scheduled_at !== 'undefined') payload.scheduled_at = input.scheduled_at || null;
  if (typeof input.mode !== 'undefined') payload.mode = input.mode;
  if (typeof input.room_id !== 'undefined') payload.room_id = input.room_id || null;

  if (typeof input.status !== 'undefined') {
    payload.status = input.status;
    if (input.status === 'open') payload.closed_at = null;
    if (input.status === 'closed' || input.status === 'archived') payload.closed_at = new Date().toISOString();
  }

  return payload;
}

function mapPost(row: ActivityPostRow, stats: Partial<ActivityPostStats> = {}): ActivityPostWithStats {
  const author = firstProfile(row.author);

  return {
    id: row.id,
    post_id: row.id,
    created_by: row.created_by,
    title: row.title,
    body: row.body,
    category: row.category,
    area: row.area,
    tags: row.tags ?? [],
    mode: row.mode,
    max_participants: row.max_participants,
    scheduled_at: row.scheduled_at,
    status: row.status ?? 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at,
    room_id: row.room_id ?? null,
    author: author ? profileRowToUserProfile(author) : null,
    interest_count: stats.interest_count ?? 0,
    accepted_count: stats.accepted_count ?? 0,
  };
}


function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveRoomId(roomIdOrSlug: string | null | undefined) {
  const value = roomIdOrSlug?.trim();
  if (!value) return null;
  if (isUuid(value)) return value;

  const { data, error } = await requireSupabaseClient()
    .from('chat_rooms')
    .select('id')
    .eq('slug', value)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data?.id ?? null;
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

function emptyStats(postIds: string[]) {
  return new Map(postIds.map((postId) => [postId, { post_id: postId, interest_count: 0, accepted_count: 0 }]));
}

async function getInterestCounts(postIds: string[]) {
  if (!postIds.length) return new Map<string, number>();

  const { data, error } = await requireSupabaseClient().rpc('get_activity_post_interest_counts', { post_ids: postIds });
  if (error) {
    console.info('[ConnectBloom] activity post interest count fetch skipped', { success: false });
    return new Map<string, number>();
  }

  return new Map((data as InterestCountRpcRow[] | null ?? []).map((row) => [row.post_id, Number(row.interest_count) || 0]));
}

async function getActivityPostStatsMap(postIds: string[]): Promise<Map<string, ActivityPostStats>> {
  const stats = emptyStats(postIds);
  if (!postIds.length) return stats;

  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .select('post_id,status')
    .in('post_id', postIds);

  if (error) {
    console.info('[ConnectBloom] activity post stats fetch skipped', { success: false });
    const counts = await getInterestCounts(postIds);
    counts.forEach((interestCount, postId) => {
      stats.set(postId, { post_id: postId, interest_count: interestCount, accepted_count: 0 });
    });
    return stats;
  }

  (data ?? []).forEach((row) => {
    const postId = String(row.post_id);
    const current = stats.get(postId) ?? { post_id: postId, interest_count: 0, accepted_count: 0 };
    if (row.status === 'interested' || row.status === 'accepted') current.interest_count += 1;
    if (row.status === 'accepted') current.accepted_count += 1;
    stats.set(postId, current);
  });

  return stats;
}

export async function getActivityPosts(filters: ActivityPostFilters = {}): Promise<ActivityPostWithAuthor[]> {
  const queryPosts = (columns: string) => {
    let query = requireSupabaseClient()
      .from('activity_posts')
      .select(columns)
      .in('status', filters.status ? [filters.status] : ['open', 'closed'])
      .order('created_at', { ascending: false });

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.tag) query = query.contains('tags', [filters.tag]);
    return query;
  };

  let { data, error } = await queryPosts(activityPostWithAuthorColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] activity posts fetch fallback used', getSafeErrorLog(error, 'activity_posts_missing_column_fallback'));
    ({ data, error } = await queryPosts(legacyActivityPostWithAuthorColumns));
  }
  if (error) {
    console.warn('[ConnectBloom] activity posts fetch failed', getSafeErrorLog(error, 'activity_posts_fetch_failed'));
    throw error;
  }

  const rows = (data ?? []) as unknown as ActivityPostRow[];
  const counts = await getInterestCounts(rows.map((row) => row.id));
  console.info('[ConnectBloom] activity posts loaded', { count: rows.length });
  return rows.map((row) => mapPost(row, { interest_count: counts.get(row.id) ?? 0 }));
}

export async function getActivityPostById(postId: string): Promise<ActivityPostWithAuthor | null> {
  const queryPost = (columns: string) => requireSupabaseClient()
    .from('activity_posts')
    .select(columns)
    .eq('id', postId)
    .maybeSingle<ActivityPostRow>();

  let { data, error } = await queryPost(activityPostWithAuthorColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] activity post fetch fallback used', getSafeErrorLog(error, 'activity_post_missing_column_fallback'));
    ({ data, error } = await queryPost(legacyActivityPostWithAuthorColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] activity post fetch failed', getSafeErrorLog(error, 'activity_post_fetch_failed'));
    throw error;
  }
  if (!data) return null;

  const [counts, stats] = await Promise.all([getInterestCounts([postId]), getActivityPostStats(postId)]);
  return mapPost(data, { ...stats, interest_count: counts.get(postId) ?? stats.interest_count });
}

export async function createActivityPost(input: ActivityPostInput): Promise<ActivityPostWithAuthor> {
  const userId = await getCurrentUserId();
  const roomId = await resolveRoomId(input.room_id);
  const payload = {
    created_by: userId,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    area: input.area?.trim() || null,
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    mode: input.mode ?? 'hybrid',
    max_participants: input.max_participants ?? null,
    scheduled_at: input.scheduled_at || null,
    status: input.status ?? 'open',
    room_id: roomId,
  };

  const insertPost = (columns: string) => requireSupabaseClient()
    .from('activity_posts')
    .insert(payload)
    .select(columns)
    .single<ActivityPostRow>();

  let { data, error } = await insertPost(activityPostColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] activity post create fallback used', getSafeErrorLog(error, 'activity_post_create_missing_column_fallback'));
    ({ data, error } = await insertPost(legacyActivityPostColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] activity post create failed', getSafeErrorLog(error, 'activity_post_create_failed'));
    throw error;
  }
  if (!data) throw new Error('募集の保存結果を確認できませんでした。');

  console.info('[ConnectBloom] activity post created', { success: true });
  const createdPost = await getActivityPostById(data.id).catch((caughtError) => {
    if (isSchemaRelationshipError(caughtError)) {
      console.warn('[ConnectBloom] activity post create readback fallback used', getSafeErrorLog(caughtError, 'activity_post_create_readback_fallback'));
      return null;
    }
    throw caughtError;
  });
  return createdPost ?? mapPost(data, { interest_count: 0, accepted_count: 0 });
}


export async function updateActivityPost(postId: string, input: ActivityPostUpdateInput): Promise<ActivityPostWithAuthor> {
  const payload = buildActivityPostUpdatePayload(input);

  const updatePost = (columns: string) => requireSupabaseClient()
    .from('activity_posts')
    .update(payload)
    .eq('id', postId)
    .select(columns)
    .single<ActivityPostRow>();

  let { data, error } = await updatePost(activityPostColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] activity post update fallback used', getSafeErrorLog(error, 'activity_post_update_missing_column_fallback'));
    ({ data, error } = await updatePost(legacyActivityPostColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] activity post update failed', getSafeErrorLog(error, 'activity_post_update_failed'));
    throw error;
  }
  if (!data) throw new Error('募集の保存結果を確認できませんでした。');

  console.info('[ConnectBloom] activity post updated', { success: true });
  const updatedPost = await getActivityPostById(data.id).catch((caughtError) => {
    if (isSchemaRelationshipError(caughtError)) {
      console.warn('[ConnectBloom] activity post update readback fallback used', getSafeErrorLog(caughtError, 'activity_post_update_readback_fallback'));
      return null;
    }
    throw caughtError;
  });
  return updatedPost ?? mapPost(data);
}

export async function canEditActivityPost(postId: string, userId: string): Promise<boolean> {
  if (!postId || !userId) return false;

  const [{ data: post, error: postError }, profile] = await Promise.all([
    requireSupabaseClient()
      .from('activity_posts')
      .select('id,created_by')
      .eq('id', postId)
      .maybeSingle<Pick<ActivityPost, 'id' | 'created_by'>>(),
    getMyProfile(userId),
  ]);

  if (postError) throw postError;
  if (!post) return false;
  return post.created_by === userId || profile?.role === 'admin';
}

export async function getMyActivityPosts(userId: string): Promise<ActivityPostWithStats[]> {
  const queryPosts = (columns: string) => requireSupabaseClient()
    .from('activity_posts')
    .select(columns)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  let { data, error } = await queryPosts(activityPostWithAuthorColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] my activity posts fetch fallback used', getSafeErrorLog(error, 'my_activity_posts_missing_column_fallback'));
    ({ data, error } = await queryPosts(legacyActivityPostWithAuthorColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] my activity posts fetch failed', getSafeErrorLog(error, 'my_activity_posts_fetch_failed'));
    throw error;
  }
  const rows = (data ?? []) as unknown as ActivityPostRow[];
  const stats = await getActivityPostStatsMap(rows.map((row) => row.id));
  return rows.map((row) => mapPost(row, stats.get(row.id)));
}

export async function getMyInterestedPosts(userId: string): Promise<MyInterestedActivityPost[]> {
  const queryInterests = (columns: string) => requireSupabaseClient()
    .from('activity_post_interests')
    .select(columns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  let { data, error } = await queryInterests(myInterestedPostColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] my interested posts fetch fallback used', getSafeErrorLog(error, 'my_interested_posts_missing_column_fallback'));
    ({ data, error } = await queryInterests(legacyMyInterestedPostColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] my interested posts fetch failed', getSafeErrorLog(error, 'my_interested_posts_fetch_failed'));
    throw error;
  }
  const rows = (data ?? []) as unknown as ActivityInterestRow[];
  const postRows = rows.map((row) => firstPost(row.post)).filter((post): post is ActivityPostRow => Boolean(post));
  const stats = await getActivityPostStatsMap(postRows.map((post) => post.id));

  return rows.map((row) => {
    const post = firstPost(row.post);
    return {
      id: row.id,
      post_id: row.post_id,
      user_id: row.user_id,
      message: row.message,
      status: row.status ?? 'interested',
      created_at: row.created_at,
      updated_at: row.updated_at,
      post: post ? mapPost(post, stats.get(post.id)) : null,
    };
  });
}

export async function expressInterest(postId: string, message?: string): Promise<ActivityPostInterest> {
  const userId = await getCurrentUserId();
  const payload = {
    post_id: postId,
    user_id: userId,
    message: message?.trim() || null,
    status: 'interested',
  };

  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .upsert(payload, { onConflict: 'post_id,user_id' })
    .select(activityInterestColumns)
    .single<ActivityPostInterest>();

  if (error) throw error;
  console.info('[ConnectBloom] activity post interest expressed', { success: true });
  return data;
}

export async function cancelActivityPostInterest(postId: string): Promise<ActivityPostInterest> {
  const userId = await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .update({ status: 'cancelled' })
    .eq('post_id', postId)
    .eq('user_id', userId)
    .select(activityInterestColumns)
    .single<ActivityPostInterest>();

  if (error) throw error;
  console.info('[ConnectBloom] activity post interest cancelled', { success: true });
  return data;
}

export async function cancelInterest(postId: string): Promise<void> {
  await cancelActivityPostInterest(postId);
}

export async function getMyInterestedPostIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .select('post_id')
    .eq('user_id', userId)
    .in('status', ['interested', 'accepted']);

  if (error) throw error;
  return (data ?? []).map((row) => row.post_id as string);
}


export async function getMyActivityPostInterest(postId: string, userId: string): Promise<ActivityPostInterest | null> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .select(activityInterestColumns)
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle<ActivityPostInterest>();

  if (error) throw error;
  return data ?? null;
}

export async function getPostInterestCount(postId: string): Promise<number> {
  const counts = await getInterestCounts([postId]);
  return counts.get(postId) ?? 0;
}

export async function getActivityPostStats(postId: string): Promise<ActivityPostStats> {
  const stats = await getActivityPostStatsMap([postId]);
  return stats.get(postId) ?? { post_id: postId, interest_count: 0, accepted_count: 0 };
}

export async function getActivityPostInterestsForOwner(postId: string): Promise<ActivityPostInterestWithProfile[]> {
  const queryInterests = (columns: string) => requireSupabaseClient()
    .from('activity_post_interests')
    .select(columns)
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  let { data, error } = await queryInterests(activityInterestWithProfileColumns);
  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] activity post interests fetch fallback used', getSafeErrorLog(error, 'activity_post_interests_missing_column_fallback'));
    ({ data, error } = await queryInterests(legacyActivityInterestWithProfileColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] activity post interests fetch failed', getSafeErrorLog(error, 'activity_post_interests_fetch_failed'));
    throw error;
  }
  return ((data ?? []) as unknown as ActivityInterestRow[]).map(mapInterest);
}

export async function updateActivityPostInterestStatus(interestId: string, status: ActivityInterestStatus): Promise<ActivityPostInterest> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .update({ status })
    .eq('id', interestId)
    .select(activityInterestColumns)
    .single<ActivityPostInterest>();

  if (error) throw error;
  console.info('[ConnectBloom] activity post interest status updated', { success: true, status });
  return data;
}

export async function acceptActivityPostInterest(interestId: string): Promise<ActivityPostInterest> {
  const updatedInterest = await updateActivityPostInterestStatus(interestId, 'accepted');
  const conversation = await ensureConversationForActivityInterest(updatedInterest.post_id, updatedInterest.id, updatedInterest.user_id);
  if (!conversation.success) {
    console.info('[ConnectBloom] accepted activity interest without conversation', { success: false, blocked: conversation.blocked });
  }
  return updatedInterest;
}

export async function declineActivityPostInterest(interestId: string): Promise<ActivityPostInterest> {
  return updateActivityPostInterestStatus(interestId, 'declined');
}

export async function closeActivityPost(postId: string): Promise<ActivityPost> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_posts')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', postId)
    .select(activityPostColumns)
    .single<ActivityPost>();

  if (error) throw error;
  console.info('[ConnectBloom] activity post closed', { success: true });
  return data;
}

export async function reopenActivityPost(postId: string): Promise<ActivityPost> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_posts')
    .update({ status: 'open', closed_at: null })
    .eq('id', postId)
    .select(activityPostColumns)
    .single<ActivityPost>();

  if (error) throw error;
  console.info('[ConnectBloom] activity post reopened', { success: true });
  return data;
}

export async function archiveActivityPost(postId: string): Promise<ActivityPost> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_posts')
    .update({ status: 'archived', closed_at: new Date().toISOString() })
    .eq('id', postId)
    .select(activityPostColumns)
    .single<ActivityPost>();

  if (error) throw error;
  console.info('[ConnectBloom] activity post archived', { success: true });
  return data;
}

export async function deleteActivityPost(postId: string): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('activity_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
  console.info('[ConnectBloom] activity post deleted', { success: true });
}
