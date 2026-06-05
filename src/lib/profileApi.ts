import type { User } from '@supabase/supabase-js';
import { normalizeDatingTemperature } from '../constants/datingTemperature';
import { DEFAULT_DATING_TEMPERATURE, type CurrentUserProfile, type ThemeId, type UserProfile } from '../types/user';
import { getSafeErrorLog } from './errorMessage';
import { requireSupabaseClient } from './supabase';
import { assertNotDemoMode } from './demoSession';

export type ProfileRow = {
  id: string;
  display_name: string;
  age: number | null;
  location: string;
  occupation: string | null;
  bio: string;
  interests: string[];
  relationship_goal: string;
  talk_topics: string | null;
  dating_temperature: string;
  onboarding_completed: boolean;
  visibility: 'public' | 'private' | 'hidden';
  role: 'user' | 'moderator' | 'admin';
  account_status?: 'active' | 'suspended' | null;
  invited_by: string | null;
  invite_code_used: string | null;
};

export type ProfileUpsert = Partial<Omit<ProfileRow, 'id'>> & {
  id: string;
};


const profileGradients = [
  'from-sky-100 via-cyan-50 to-yellow-100',
  'from-cyan-100 via-sky-50 to-blue-100',
  'from-yellow-100 via-sky-50 to-cyan-100',
  'from-sky-100 via-cyan-50 to-blue-100',
  'from-blue-100 via-cyan-50 to-yellow-100',
];

function getProfileGradient(profileId: string) {
  const charTotal = [...profileId].reduce((total, char) => total + char.charCodeAt(0), 0);
  return profileGradients[charTotal % profileGradients.length];
}

const baseProfileColumnList = [
  'id',
  'display_name',
  'age',
  'location',
  'occupation',
  'bio',
  'interests',
  'relationship_goal',
  'talk_topics',
  'dating_temperature',
  'onboarding_completed',
  'visibility',
  'role',
  'invited_by',
  'invite_code_used',
];

const profileColumns = [
  ...baseProfileColumnList.slice(0, 12),
  'account_status',
  ...baseProfileColumnList.slice(12),
].join(',');

const legacyProfileColumnList = baseProfileColumnList.filter((column) => column !== 'talk_topics');
const profileColumnsWithoutOptionalColumns = legacyProfileColumnList.join(',');

type ProfileQueryKind = 'getMyProfile' | 'upsertMyProfile' | 'updateMyProfile' | 'getPublicProfiles' | 'getPublicProfileById';

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function normalizeProfileRow(profile: ProfileRow): ProfileRow {
  return {
    ...profile,
    talk_topics: profile.talk_topics ?? null,
    account_status: profile.account_status ?? 'active',
  };
}

function isMissingOptionalProfileColumnError(error: unknown) {
  const errorLike = error && typeof error === 'object' ? (error as SupabaseErrorLike) : {};
  const searchableText = [errorLike.message, errorLike.details, errorLike.hint, errorLike.code].filter(Boolean).join(' ');
  return /(account_status|talk_topics)/i.test(searchableText)
    && (/column|schema cache|could not find|not found|does not exist|42703|PGRST204/i.test(searchableText));
}

function logOptionalProfileColumnsFallback(error: unknown, phase: ProfileQueryKind) {
  console.warn('[ProfileApi] optional profile columns unavailable; falling back to legacy profile columns', getSafeErrorLog(error, phase));
}

function omitOptionalProfileColumns<TProfile extends { account_status?: ProfileRow['account_status']; talk_topics?: ProfileRow['talk_topics'] }>(profile: TProfile): Omit<TProfile, 'account_status' | 'talk_topics'> {
  const { account_status: _accountStatus, talk_topics: _talkTopics, ...profileWithoutOptionalColumns } = profile;
  void _accountStatus;
  void _talkTopics;
  return profileWithoutOptionalColumns;
}

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (!error) return data ? normalizeProfileRow(data) : null;
  if (!isMissingOptionalProfileColumnError(error)) throw error;

  logOptionalProfileColumnsFallback(error, 'getMyProfile');
  const fallbackResult = await client
    .from('profiles')
    .select(profileColumnsWithoutOptionalColumns)
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (fallbackResult.error) throw fallbackResult.error;
  return fallbackResult.data ? normalizeProfileRow(fallbackResult.data) : null;
}

export async function upsertMyProfile(profile: ProfileUpsert): Promise<ProfileRow> {
  assertNotDemoMode('プロフィール保存');
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select(profileColumns)
    .single<ProfileRow>();

  if (!error) return normalizeProfileRow(data);
  if (!isMissingOptionalProfileColumnError(error)) throw error;

  logOptionalProfileColumnsFallback(error, 'upsertMyProfile');
  const fallbackResult = await client
    .from('profiles')
    .upsert(omitOptionalProfileColumns(profile), { onConflict: 'id' })
    .select(profileColumnsWithoutOptionalColumns)
    .single<ProfileRow>();

  if (fallbackResult.error) throw fallbackResult.error;
  return normalizeProfileRow(fallbackResult.data);
}

export async function updateMyProfile(profile: ProfileUpsert): Promise<ProfileRow> {
  assertNotDemoMode('プロフィール更新');
  const { id, ...updates } = profile;
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(profileColumns)
    .single<ProfileRow>();

  if (!error) return normalizeProfileRow(data);
  if (!isMissingOptionalProfileColumnError(error)) throw error;

  logOptionalProfileColumnsFallback(error, 'updateMyProfile');
  const fallbackResult = await client
    .from('profiles')
    .update(omitOptionalProfileColumns(updates))
    .eq('id', id)
    .select(profileColumnsWithoutOptionalColumns)
    .single<ProfileRow>();

  if (fallbackResult.error) throw fallbackResult.error;
  return normalizeProfileRow(fallbackResult.data);
}

export async function ensureProfileForUser(user: User): Promise<ProfileRow> {
  const existingProfile = await getMyProfile(user.id);
  if (existingProfile) return existingProfile;

  const displayName =
    user.user_metadata?.full_name?.trim?.()
    ?? user.user_metadata?.name?.trim?.()
    ?? user.email?.split('@')[0]
    ?? '';

  return upsertMyProfile({
    id: user.id,
    display_name: displayName,
    age: null,
    location: '',
    occupation: '',
    bio: '',
    interests: [],
    relationship_goal: '',
    talk_topics: null,
    dating_temperature: DEFAULT_DATING_TEMPERATURE,
    onboarding_completed: false,
    visibility: 'public',
    role: 'user',
    account_status: 'active',
    invited_by: null,
    invite_code_used: null,
  });
}

export function profileRowToCurrentUser(profile: ProfileRow, fallbackTheme: ThemeId): CurrentUserProfile {
  return {
    id: profile.id,
    name: profile.display_name,
    age: profile.age ?? 18,
    location: profile.location,
    occupation: profile.occupation ?? '',
    bio: profile.bio,
    interests: profile.interests,
    datingTemperature: profile.dating_temperature || DEFAULT_DATING_TEMPERATURE,
    relationshipGoal: profile.relationship_goal,
    talkTopics: profile.talk_topics ?? '',
    themePreference: fallbackTheme,
  };
}


export async function getPublicProfiles(currentUserId?: string, limit = 24): Promise<ProfileRow[]> {
  const client = requireSupabaseClient();
  let query = client
    .from('profiles')
    .select(profileColumns)
    .eq('visibility', 'public')
    .eq('onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }

  const { data, error } = await query;
  if (!error) return ((data ?? []) as unknown as ProfileRow[]).map(normalizeProfileRow);
  if (!isMissingOptionalProfileColumnError(error)) throw error;

  logOptionalProfileColumnsFallback(error, 'getPublicProfiles');
  let fallbackQuery = client
    .from('profiles')
    .select(profileColumnsWithoutOptionalColumns)
    .eq('visibility', 'public')
    .eq('onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (currentUserId) {
    fallbackQuery = fallbackQuery.neq('id', currentUserId);
  }

  const fallbackResult = await fallbackQuery;
  if (fallbackResult.error) throw fallbackResult.error;
  return ((fallbackResult.data ?? []) as unknown as ProfileRow[]).map(normalizeProfileRow);
}


export async function getPublicProfileById(profileId: string): Promise<ProfileRow | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select(profileColumns)
    .eq('id', profileId)
    .eq('visibility', 'public')
    .maybeSingle<ProfileRow>();

  if (!error) return data ? normalizeProfileRow(data) : null;
  if (!isMissingOptionalProfileColumnError(error)) throw error;

  logOptionalProfileColumnsFallback(error, 'getPublicProfileById');
  const fallbackResult = await client
    .from('profiles')
    .select(profileColumnsWithoutOptionalColumns)
    .eq('id', profileId)
    .eq('visibility', 'public')
    .maybeSingle<ProfileRow>();

  if (fallbackResult.error) throw fallbackResult.error;
  return fallbackResult.data ? normalizeProfileRow(fallbackResult.data) : null;
}

export function profileRowToUserProfile(profile: ProfileRow, primaryPhotoUrl?: string): UserProfile {
  return {
    id: profile.id,
    name: profile.display_name || 'ConnectBloomユーザー',
    age: profile.age ?? 18,
    location: profile.location || '活動エリア未設定',
    occupation: profile.occupation || '自然体のプロフィール',
    bio: profile.bio || 'プロフィールを準備中です。ゆっくりご縁を育てていきたいです。',
    interests: profile.interests?.length ? profile.interests : ['紹介経由'],
    datingTemperature: normalizeDatingTemperature(profile.dating_temperature),
    relationshipGoal: profile.relationship_goal,
    talkTopics: profile.talk_topics ?? '',
    introducedBy: profile.invited_by ? '紹介者' : 'ConnectBloom',
    photoUrl: primaryPhotoUrl,
    avatarUrl: primaryPhotoUrl,
    primaryPhotoUrl,
    gradient: getProfileGradient(profile.id),
  };
}
