import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnvironment = {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  missingKeys: string[];
  urlHasRestPath: boolean;
  urlNormalized: boolean;
  anonKeyExists: boolean;
  anonKeyPrefixType: SupabaseAnonKeyPrefixType;
};

type SupabaseAnonKeyPrefixType = 'sb_publishable' | 'jwt_like' | 'unknown';

export type SupabaseConnectionStatus = {
  isConfigured: boolean;
  supabaseUrlExists: boolean;
  supabaseAnonKeyExists: boolean;
  supabaseUrlNormalized: boolean;
  supabaseUrlHasRestPath: boolean;
  supabaseAnonKeyLengthExists: boolean;
  supabaseAnonKeyPrefixType: SupabaseAnonKeyPrefixType;
  clientCreated: boolean;
  authMode: 'Supabase' | 'Local demo';
  currentOrigin: string;
  redirectUrl: string;
};

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

function stripMatchingOuterQuotes(value: string) {
  let normalizedValue = value.trim();
  const quotePairs = ['"', "'", '`'];

  while (
    normalizedValue.length >= 2
    && quotePairs.some((quote) => normalizedValue.startsWith(quote) && normalizedValue.endsWith(quote))
  ) {
    normalizedValue = normalizedValue.slice(1, -1).trim();
  }

  return normalizedValue;
}

function getSupabaseUrlHasRestPath(value: string) {
  return /\/rest\/v1(?:\/|$)/i.test(stripMatchingOuterQuotes(value));
}

function normalizeSupabaseUrl(value: string) {
  const trimmedValue = stripMatchingOuterQuotes(value).replace(/\/+$/, '');
  if (!trimmedValue) return '';

  try {
    const parsedUrl = new URL(trimmedValue);
    const normalizedOrigin = parsedUrl.origin.replace(/\/+$/, '');

    if (!/^https:\/\/[^/]+\.supabase\.co$/i.test(normalizedOrigin)) {
      return '';
    }

    return normalizedOrigin;
  } catch {
    return '';
  }
}

function normalizeSupabaseAnonKey(value: string) {
  return stripMatchingOuterQuotes(value).replace(/[\r\n]/g, '').trim();
}

function getSupabaseAnonKeyPrefixType(value: string): SupabaseAnonKeyPrefixType {
  if (value.startsWith('sb_publishable_')) return 'sb_publishable';
  if (/^eyJ[^.]*\.[^.]+\.[^.]+$/.test(value)) return 'jwt_like';
  return 'unknown';
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = normalizeSupabaseAnonKey(rawSupabaseAnonKey);
const supabaseUrlHasRestPath = getSupabaseUrlHasRestPath(rawSupabaseUrl);
const supabaseUrlNormalized = Boolean(supabaseUrl && /^https:\/\/[^/]+\.supabase\.co$/i.test(supabaseUrl));
const supabaseAnonKeyExists = Boolean(supabaseAnonKey);

const missingKeys = [
  ['VITE_SUPABASE_URL', supabaseUrl],
  ['VITE_SUPABASE_ANON_KEY', supabaseAnonKey],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const supabaseConfig: SupabaseEnvironment = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: Boolean(supabaseUrlNormalized && supabaseAnonKeyExists),
  missingKeys,
  urlHasRestPath: supabaseUrlHasRestPath,
  urlNormalized: supabaseUrlNormalized,
  anonKeyExists: supabaseAnonKeyExists,
  anonKeyPrefixType: getSupabaseAnonKeyPrefixType(supabaseAnonKey),
};

export const isSupabaseConfigured = supabaseConfig.isConfigured;
export const supabaseConfigured = supabaseConfig.isConfigured;

if (!supabaseConfig.isConfigured) {
  console.warn(
    `[EnBloom] Supabase is not configured yet. Missing or invalid: ${supabaseConfig.missingKeys.join(
      ', ',
    )}. The localStorage demo experience will continue to run.`,
  );
}

export const supabase: SupabaseClient | null = supabaseConfig.isConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseConnectionStatus(): SupabaseConnectionStatus {
  const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const redirectUrl = currentOrigin ? `${currentOrigin}/auth/callback` : '';
  const clientCreated = Boolean(supabase);

  return {
    isConfigured: supabaseConfig.isConfigured,
    supabaseUrlExists: Boolean(stripMatchingOuterQuotes(rawSupabaseUrl)),
    supabaseAnonKeyExists: supabaseConfig.anonKeyExists,
    supabaseUrlNormalized: supabaseConfig.urlNormalized,
    supabaseUrlHasRestPath: supabaseConfig.urlHasRestPath,
    supabaseAnonKeyLengthExists: supabaseConfig.anonKeyExists,
    supabaseAnonKeyPrefixType: supabaseConfig.anonKeyPrefixType,
    clientCreated,
    authMode: clientCreated ? 'Supabase' : 'Local demo',
    currentOrigin,
    redirectUrl,
  };
}

export function assertSupabaseConfigured(): boolean {
  if (supabaseConfig.isConfigured) return true;

  console.warn(
    `[EnBloom] Supabase environment variables are missing or invalid: ${supabaseConfig.missingKeys.join(
      ', ',
    )}`,
  );

  return false;
}

export function requireSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      `Supabase is not configured. Missing or invalid environment variables: ${supabaseConfig.missingKeys.join(', ')}`,
    );
  }

  return supabase;
}
