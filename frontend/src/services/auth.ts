import { supabase } from '@/lib/supabase';
import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: 'admin' | 'user' | string | null;
}

function getStorage(rememberMe = true) {
  if (typeof window === 'undefined') return null;
  return rememberMe ? window.localStorage : window.sessionStorage;
}

function clearSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function persistSession(session: AuthSession, rememberMe = true) {
  const storage = getStorage(rememberMe);
  if (!storage) return;

  clearSession();
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function normalizeRole(role: ProfileRow['role']): AuthUser['role'] {
  return role === 'admin' ? 'admin' : 'user';
}

async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('Login validado, mas não foi possível carregar o perfil do usuário.');
  }

  return data;
}

async function upsertProfile(userId: string, fullName: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: fullName, role: 'user' }, { onConflict: 'id' });

  if (error) {
    throw new Error('Conta criada, mas não foi possível salvar o perfil do usuário.');
  }
}

async function createSession(
  authSession: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>,
): Promise<AuthSession> {
  const profile = await getProfile(authSession.user.id);

  return {
    user: {
      id: authSession.user.id,
      email: authSession.user.email ?? '',
      name: profile?.full_name || authSession.user.user_metadata?.full_name || authSession.user.email || 'Usuário',
      role: normalizeRole(profile?.role ?? null),
    },
    token: authSession.access_token,
    refreshToken: authSession.refresh_token,
    expiresAt: new Date((authSession.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString(),
  };
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (error || !data.session) {
    throw new Error(error?.message || 'Credenciais inválidas.');
  }

  const session = await createSession(data.session);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const fullName = input.name.trim();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Não foi possível criar a conta.');
  }

  if (!data.session) {
    throw new Error('Conta criada. Confirme seu e-mail antes de entrar.');
  }

  await upsertProfile(data.user.id, fullName);
  const session = await createSession(data.session);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
}

export async function getSession(): Promise<AuthSession | null> {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/forgot-password`,
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível enviar o e-mail.');
  }
}
