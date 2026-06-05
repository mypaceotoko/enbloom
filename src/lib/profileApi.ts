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
  talkTopics?: string | null;
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

const profileColumnsWithoutAccountStatus = baseProfileColumnList.join(',');
const legacyProfileColumnList = baseProfileColumnList.filter((column) => column !== 'talk_topics');
const profileColumnsWithoutTalkTopics = legacyProfileColumnList.join(',');

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

function getMissingOptionalProfileColumn(error: unknown): 'account_status' | 'talk_topics' | null {
  const errorLike = error && typeof error === 'object' ? (error as SupabaseErrorLike) : {};
  const searchableText = [errorLike.message, errorLike.details, errorLike.hint, errorLike.code].filter(Boolean).join(' ');
  const isMissingColumnError = /column|schema cache|could not find|not found|does not exist|42703|PGRST204/i.test(searchableText);
  if (!isMissingColumnError) return null;
  if (/account_status/i.test(searchableText)) return 'account_status';
  if (/talk_topics/i.test(searchableText)) return 'talk_topics';
  return null;
}

function isMissingOptionalProfileColumnError(error: unknown) {
  return getMissingOptionalProfileColumn(error) !== null;
}

function getFallbackProfileColumns(error: unknown) {
  return getMissingOptionalProfileColumn(error) === 'talk_topics' ? profileColumnsWithoutTalkTopics : profileColumnsWithoutAccountStatus;
}

function logOptionalProfileColumnsFallback(error: unknown, phase: ProfileQueryKind) {
  console.warn('[ProfileApi] optional profile columns unavailable; falling back to legacy profile columns', getSafeErrorLog(error, phase));
}

function logTalkTopicsSaveDiagnostics(params: {
  phase: Extract<ProfileQueryKind, 'upsertMyProfile' | 'updateMyProfile'>;
  currentUserId: string;
  payload?: Partial<ProfileRow>;
  savedProfile?: ProfileRow | null;
  error?: unknown;
}) {
  const hasTalkTopicsInPayload = Object.prototype.hasOwnProperty.call(params.payload ?? {}, 'talk_topics');
  const talkTopics = hasTalkTopicsInPayload ? params.payload?.talk_topics : undefined;

  console.info('[ConnectBloom] profile talk_topics save diagnostic', {
    action: 'profile_talk_topics_save',
    phase: params.phase,
    currentUserId: params.currentUserId,
    talkTopicsLength: typeof talkTopics === 'string' ? talkTopics.length : 0,
    hasTalkTopicsInPayload,
    updateError: params.error ? getSafeErrorLog(params.error, params.phase) : null,
    savedProfileTalkTopicsExists: typeof params.savedProfile?.talk_topics === 'string' && params.savedProfile.talk_topics.length > 0,
  });
}

function normalizeTalkTopicsInput(talkTopics: string | null | undefined) {
  if (typeof talkTopics !== 'string') return null;
  const trimmedTalkTopics = talkTopics.trim().slice(0, 160);
  return trimmedTalkTopics || null;
}

function normalizeProfileWritePayload(profile: ProfileUpsert): ProfileUpsert {
  const { talkTopics, ...profileWithoutAlias } = profile;
  return {
    ...profileWithoutAlias,
    talk_topics: normalizeTalkTopicsInput(profile.talk_topics ?? talkTopics),
  };
}

function omitUnavailableProfileColumns<TProfile extends { account_status?: ProfileRow['account_status']; talk_topics?: ProfileRow['talk_topics'] }>(profile: TProfile, error: unknown) {
  if (getMissingOptionalProfileColumn(error) === 'talk_topics') {
    const { account_status: _accountStatus, talk_topics: _talkTopics, ...profileWithoutOptionalColumns } = profile;
    void _accountStatus;
    void _talkTopics;
    return profileWithoutOptionalColumns;
  }

  const { account_status: _accountStatus, ...profileWithoutAccountStatus } = profile;
  void _accountStatus;
  return profileWithoutAccountStatus;
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
    .select(getFallbackProfileColumns(error))
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (fallbackResult.error) throw fallbackResult.error;
  return fallbackResult.data ? normalizeProfileRow(fallbackResult.data) : null;
}

export async function upsertMyProfile(profile: ProfileUpsert): Promise<ProfileRow> {
  assertNotDemoMode('プロフィール保存');
  const normalizedPayload = normalizeProfileWritePayload(profile);
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .upsert(normalizedPayload, { onConflict: 'id' })
    .select(profileColumns)
    .single<ProfileRow>();

  if (!error) {
    const normalizedProfile = normalizeProfileRow(data);
    logTalkTopicsSaveDiagnostics({ phase: 'upsertMyProfile', currentUserId: normalizedPayload.id, payload: normalizedPayload, savedProfile: normalizedProfile });
    return normalizedProfile;
  }
  if (!isMissingOptionalProfileColumnError(error)) {
    logTalkTopicsSaveDiagnostics({ phase: 'upsertMyProfile', currentUserId: normalizedPayload.id, payload: normalizedPayload, error });
    throw error;
  }

  logTalkTopicsSaveDiagnostics({ phase: 'upsertMyProfile', currentUserId: normalizedPayload.id, payload: normalizedPayload, error });
  logOptionalProfileColumnsFallback(error, 'upsertMyProfile');
  const fallbackResult = await client
    .from('profiles')
    .upsert(omitUnavailableProfileColumns(normalizedPayload, error), { onConflict: 'id' })
    .select(getFallbackProfileColumns(error))
    .single<ProfileRow>();

  if (fallbackResult.error) {
    logTalkTopicsSaveDiagnostics({ phase: 'upsertMyProfile', currentUserId: normalizedPayload.id, payload: normalizedPayload, error: fallbackResult.error });
    throw fallbackResult.error;
  }
  const normalizedProfile = normalizeProfileRow(fallbackResult.data);
  logTalkTopicsSaveDiagnostics({ phase: 'upsertMyProfile', currentUserId: normalizedPayload.id, payload: normalizedPayload, savedProfile: normalizedProfile });
  return normalizedProfile;
}

export async function updateMyProfile(profile: ProfileUpsert): Promise<ProfileRow> {
  assertNotDemoMode('プロフィール更新');
  const normalizedPayload = normalizeProfileWritePayload(profile);
  const { id, ...updates } = normalizedPayload;
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(profileColumns)
    .single<ProfileRow>();

  if (!error) {
    const normalizedProfile = normalizeProfileRow(data);
    logTalkTopicsSaveDiagnostics({ phase: 'updateMyProfile', currentUserId: id, payload: updates, savedProfile: normalizedProfile });
    return normalizedProfile;
  }
  if (!isMissingOptionalProfileColumnError(error)) {
    logTalkTopicsSaveDiagnostics({ phase: 'updateMyProfile', currentUserId: id, payload: updates, error });
    throw error;
  }

  logTalkTopicsSaveDiagnostics({ phase: 'updateMyProfile', currentUserId: id, payload: updates, error });
  logOptionalProfileColumnsFallback(error, 'updateMyProfile');
  const fallbackResult = await client
    .from('profiles')
    .update(omitUnavailableProfileColumns(updates, error))
    .eq('id', id)
    .select(getFallbackProfileColumns(error))
    .single<ProfileRow>();

  if (fallbackResult.error) {
    logTalkTopicsSaveDiagnostics({ phase: 'updateMyProfile', currentUserId: id, payload: updates, error: fallbackResult.error });
    throw fallbackResult.error;
  }
  const normalizedProfile = normalizeProfileRow(fallbackResult.data);
  logTalkTopicsSaveDiagnostics({ phase: 'updateMyProfile', currentUserId: id, payload: updates, savedProfile: normalizedProfile });
  return normalizedProfile;
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
    .select(getFallbackProfileColumns(error))
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
    .select(getFallbackProfileColumns(error))
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
