const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfig = {
  url: supabaseUrl || '',
  anonKey: supabaseAnonKey || '',
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
};

// Phase 1ではSupabaseクライアントを初期化しません。
// 次フェーズで @supabase/supabase-js を導入し、supabaseConfigを使って接続します。
