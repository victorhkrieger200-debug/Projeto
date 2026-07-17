import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './env.js';

loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    'Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY antes de iniciar o backend.',
  );
}

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, authOptions);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, authOptions);
