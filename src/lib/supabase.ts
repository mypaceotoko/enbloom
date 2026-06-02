type SupabaseEnvironment = {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  missingKeys: string[];
};

type SupabaseClientPlaceholder = {
  status: 'not-initialized';
  reason: 'missing-env' | 'client-dependency-not-installed';
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

const missingKeys = [
  ['VITE_SUPABASE_URL', supabaseUrl],
  ['VITE_SUPABASE_ANON_KEY', supabaseAnonKey],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const supabaseConfig: SupabaseEnvironment = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: missingKeys.length === 0,
  missingKeys,
};

if (!supabaseConfig.isConfigured) {
  console.warn(
    `[EnBloom] Supabase is not configured yet. Missing: ${supabaseConfig.missingKeys.join(
      ', ',
    )}. The localStorage demo experience will continue to run.`,
  );
}

// Phase 3 前半では本接続を開始せず、localStorageデモ体験を維持します。
// 次フェーズで @supabase/supabase-js を導入できたら、ここで createClient を呼び出し、
// アプリ全体の Supabase client export に差し替えます。
export const supabase: SupabaseClientPlaceholder | null = supabaseConfig.isConfigured
  ? {
      status: 'not-initialized',
      reason: 'client-dependency-not-installed',
    }
  : null;

export function assertSupabaseConfigured(): boolean {
  if (supabaseConfig.isConfigured) return true;

  console.warn(
    `[EnBloom] Supabase environment variables are missing: ${supabaseConfig.missingKeys.join(
      ', ',
    )}`,
  );

  return false;
}
