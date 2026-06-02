import type { User } from '@supabase/supabase-js';
import type { CurrentUserProfile, ThemeId } from '../types/user';
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
  invited_by: string | null;
  invite_code_used: string | null;
};

export type ProfileUpsert = Partial<Omit<ProfileRow, 'id'>> & {
  id: string;
};

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
    dating_temperature: '',
    onboarding_completed: false,
    visibility: 'public',
    role: 'user',
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
    datingTemperature: profile.dating_temperature,
    relationshipGoal: profile.relationship_goal,
    themePreference: fallbackTheme,
  };
}
