import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = rawSupabaseUrl?.trim().replace(/\/$/, '') ?? '';
const supabaseAnonKey = rawSupabaseAnonKey?.trim() ?? '';

export const missingSupabaseEnvVars = [
  !supabaseUrl ? 'VITE_SUPABASE_URL' : undefined,
  !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : undefined,
].filter(Boolean) as string[];

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;

export const supabaseConfig = isSupabaseConfigured
  ? {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    }
  : null;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: false,
      },
    })
  : null;
