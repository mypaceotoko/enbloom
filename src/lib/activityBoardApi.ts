import type { ActivityPost, ActivityPostFilters, ActivityPostInput, ActivityPostInterest, ActivityPostWithAuthor } from '../types/activityBoard';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { requireSupabaseClient } from './supabase';

type ActivityPostRow = ActivityPost & {
  author?: ProfileRow | ProfileRow[] | null;
};

type InterestCountRpcRow = {
  post_id: string;
  interest_count: number;
};

const activityPostColumns = [
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

const activityPostWithAuthorColumns = [
  activityPostColumns,
  'author:profiles!activity_posts_created_by_fkey(id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used)',
].join(',');

const activityInterestColumns = 'id,post_id,user_id,message,status,created_at,updated_at';

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function mapPost(row: ActivityPostRow, interestCount = 0): ActivityPostWithAuthor {
  const author = firstProfile(row.author);

  return {
    id: row.id,
    created_by: row.created_by,
    title: row.title,
    body: row.body,
    category: row.category,
    area: row.area,
    tags: row.tags ?? [],
    mode: row.mode,
    max_participants: row.max_participants,
    scheduled_at: row.scheduled_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at,
    author: author ? profileRowToUserProfile(author) : null,
    interest_count: interestCount,
  };
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

async function getInterestCounts(postIds: string[]) {
  if (!postIds.length) return new Map<string, number>();

  const { data, error } = await requireSupabaseClient().rpc('get_activity_post_interest_counts', { post_ids: postIds });
  if (error) {
    console.info('[EnBloom] activity post interest count fetch skipped', { success: false });
    return new Map<string, number>();
  }

  return new Map((data as InterestCountRpcRow[] | null ?? []).map((row) => [row.post_id, Number(row.interest_count) || 0]));
}

export async function getActivityPosts(filters: ActivityPostFilters = {}): Promise<ActivityPostWithAuthor[]> {
  let query = requireSupabaseClient()
    .from('activity_posts')
    .select(activityPostWithAuthorColumns)
    .in('status', filters.status ? [filters.status] : ['open', 'closed'])
    .order('created_at', { ascending: false });

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.tag) query = query.contains('tags', [filters.tag]);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as ActivityPostRow[];
  const counts = await getInterestCounts(rows.map((row) => row.id));
  console.info('[EnBloom] activity posts loaded', { count: rows.length });
  return rows.map((row) => mapPost(row, counts.get(row.id) ?? 0));
}

export async function getActivityPostById(postId: string): Promise<ActivityPostWithAuthor | null> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_posts')
    .select(activityPostWithAuthorColumns)
    .eq('id', postId)
    .maybeSingle<ActivityPostRow>();

  if (error) throw error;
  if (!data) return null;

  const count = await getPostInterestCount(postId);
  return mapPost(data, count);
}

export async function createActivityPost(input: ActivityPostInput): Promise<ActivityPostWithAuthor> {
  const userId = await getCurrentUserId();
  const payload = {
    created_by: userId,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    area: input.area?.trim() || null,
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    mode: input.mode ?? 'either',
    max_participants: input.max_participants ?? null,
    scheduled_at: input.scheduled_at || null,
    status: input.status ?? 'open',
  };

  const { data, error } = await requireSupabaseClient()
    .from('activity_posts')
    .insert(payload)
    .select(activityPostWithAuthorColumns)
    .single<ActivityPostRow>();

  if (error) throw error;
  console.info('[EnBloom] activity post created', { success: true });
  return mapPost(data, 0);
}

export async function getMyActivityPosts(userId: string): Promise<ActivityPostWithAuthor[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_posts')
    .select(activityPostWithAuthorColumns)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as ActivityPostRow[];
  const counts = await getInterestCounts(rows.map((row) => row.id));
  return rows.map((row) => mapPost(row, counts.get(row.id) ?? 0));
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
  console.info('[EnBloom] activity post interest expressed', { success: true });
  return data;
}

export async function cancelInterest(postId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
  console.info('[EnBloom] activity post interest cancelled', { success: true });
}

export async function getMyInterestedPostIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .select('post_id')
    .eq('user_id', userId)
    .eq('status', 'interested');

  if (error) throw error;
  return (data ?? []).map((row) => row.post_id as string);
}

export async function getPostInterestCount(postId: string): Promise<number> {
  const counts = await getInterestCounts([postId]);
  return counts.get(postId) ?? 0;
}

export async function getActivityPostInterestsForOwner(postId: string): Promise<ActivityPostInterest[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_post_interests')
    .select(activityInterestColumns)
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ActivityPostInterest[];
}
