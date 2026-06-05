import type { User } from '@supabase/supabase-js';
import { DEFAULT_DATING_TEMPERATURE, type CurrentUserProfile, type ThemeId, type UserProfile } from '../types/user';
import { requireSupabaseClient } from './supabase';

export type ProfileRow = {
  id: string;
  display_name: string;
  age: number | null;
  location: string;
  occupation: string | null;
  bio: string;
  interests: string[];
  relationship_goal: string;
  dating_temperature: string;
  onboarding_completed: boolean;
  visibility: 'public' | 'private' | 'hidden';
  role: 'user' | 'moderator' | 'admin';
  account_status: 'active' | 'suspended';
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

const profileColumns = [
  'id',
  'display_name',
  'age',
  'location',
  'occupation',
  'bio',
  'interests',
  'relationship_goal',
  'dating_temperature',
  'onboarding_completed',
  'visibility',
  'role',
  'account_status',
  'invited_by',
  'invite_code_used',
].join(',');

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data ?? null;
}

export async function upsertMyProfile(profile: ProfileUpsert): Promise<ProfileRow> {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select(profileColumns)
    .single<ProfileRow>();

  if (error) throw error;
  return data;
}

export async function updateMyProfile(profile: ProfileUpsert): Promise<ProfileRow> {
  const { id, ...updates } = profile;
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(profileColumns)
    .single<ProfileRow>();

  if (error) throw error;
  return data;
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
    themePreference: fallbackTheme,
  };
}


export async function getPublicProfiles(currentUserId?: string, limit = 24): Promise<ProfileRow[]> {
  let query = requireSupabaseClient()
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
  if (error) throw error;
  return (data ?? []) as unknown as ProfileRow[];
}


export async function getPublicProfileById(profileId: string): Promise<ProfileRow | null> {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .select(profileColumns)
    .eq('id', profileId)
    .eq('visibility', 'public')
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data ?? null;
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
    datingTemperature: profile.dating_temperature || DEFAULT_DATING_TEMPERATURE,
    relationshipGoal: profile.relationship_goal || '自然体で長く付き合える関係',
    introducedBy: profile.invited_by ? '紹介者' : 'ConnectBloom',
    photoUrl: primaryPhotoUrl,
    avatarUrl: primaryPhotoUrl,
    primaryPhotoUrl,
    gradient: getProfileGradient(profile.id),
  };
}
