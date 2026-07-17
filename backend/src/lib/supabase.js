import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './env.js';

loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

export const missingSupabaseEnvVars = [
  !supabaseUrl ? 'SUPABASE_URL' : undefined,
  !supabaseAnonKey ? 'SUPABASE_ANON_KEY' : undefined,
  !supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : undefined,
].filter(Boolean);

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;

if (!isSupabaseConfigured) {
  console.warn(
    `Backend iniciado sem autenticação Supabase. Configure ${missingSupabaseEnvVars.join(
      ', ',
    )} para habilitar login, cadastro e recuperação de senha.`,
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, authOptions)
  : null;

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, authOptions)
  : null;
