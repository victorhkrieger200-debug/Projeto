import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, missingSupabaseEnvVars, supabase } from '@/lib/supabase';
import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';
const EXPIRATION_SAFETY_WINDOW_MS = 60_000;
const MIN_PASSWORD_LENGTH = 8;

interface ProfileRow {
  full_name?: string | null;
  role?: string | null;
}

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      `Autenticação indisponível. Configure ${missingSupabaseEnvVars.join(
        ', ',
      )} no arquivo .env do frontend e reinicie o servidor.`,
    );
  }

  return supabase;
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

function getStoredSessionLocation() {
  if (typeof window === 'undefined') return null;

  const localRaw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (localRaw) return { raw: localRaw, rememberMe: true };

  const sessionRaw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionRaw) return { raw: sessionRaw, rememberMe: false };

  return null;
}

function persistSession(session: AuthSession, rememberMe = true) {
  const storage = getStorage(rememberMe);
  if (!storage) return;

  clearSession();
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, rememberMe }));
}

function normalizeRole(role?: string | null): AuthUser['role'] {
  return role === 'admin' ? 'admin' : 'user';
}

function translateAuthError(message?: string) {
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }

  if (normalizedMessage.includes('user already registered') || normalizedMessage.includes('already registered')) {
    return 'Já existe uma conta com este e-mail.';
  }

  if (normalizedMessage.includes('password')) {
    return 'A senha não atende aos requisitos mínimos.';
  }

  if (normalizedMessage.includes('rate limit')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }

  return message || 'Não foi possível completar a solicitação.';
}

async function getProfile(userId: string): Promise<ProfileRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

function buildUser(user: User, profile?: ProfileRow | null): AuthUser {
  const metadataName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined;

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile?.full_name || metadataName || user.email || 'Usuário',
    role: normalizeRole(profile?.role),
  };
}

async function createSession(session: Session, rememberMe = true): Promise<AuthSession> {
  const profile = await getProfile(session.user.id);

  return {
    user: buildUser(session.user, profile),
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date(session.expires_at ? session.expires_at * 1000 : Date.now()).toISOString(),
    rememberMe,
  };
}

function isSessionFresh(session: AuthSession) {
  return new Date(session.expiresAt).getTime() - EXPIRATION_SAFETY_WINDOW_MS > Date.now();
}

async function refreshStoredSession(session: AuthSession): Promise<AuthSession | null> {
  if (!session.refreshToken) return null;

  const client = getSupabaseClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: session.refreshToken });

  if (error || !data.session) return null;

  const refreshedSession = await createSession(data.session, session.rememberMe ?? true);
  persistSession(refreshedSession, refreshedSession.rememberMe);
  return refreshedSession;
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const client = getSupabaseClient();
  const rememberMe = input.rememberMe ?? true;
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error || !data.session) {
    throw new Error(translateAuthError(error?.message));
  }

  const session = await createSession(data.session, rememberMe);
  persistSession(session, rememberMe);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const client = getSupabaseClient();
  const rememberMe = input.rememberMe ?? true;
  const name = input.name.trim().replace(/\s+/g, ' ');
  const email = input.email.trim().toLowerCase();

  if (!name || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('Informe nome, e-mail válido e senha com pelo menos 8 caracteres.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error || !data.user) {
    throw new Error(translateAuthError(error?.message));
  }

  if (!data.session) {
    throw new Error('Conta criada. Confirme seu e-mail antes de entrar.');
  }

  await client
    .from('profiles')
    .upsert({ id: data.user.id, full_name: name, role: 'user' }, { onConflict: 'id' });

  const session = await createSession(data.session, rememberMe);
  persistSession(session, rememberMe);
  return session;
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  await client.auth.signOut().catch(() => undefined);
  clearSession();
}

export async function getSession(
  options: { validateRemotely?: boolean } = {},
): Promise<AuthSession | null> {
  const stored = getStoredSessionLocation();
  if (!stored) return null;

  try {
    const session = JSON.parse(stored.raw) as AuthSession;
    const rememberMe = session.rememberMe ?? stored.rememberMe;
    let activeSession: AuthSession = { ...session, rememberMe };

    if (!isSessionFresh(activeSession)) {
      const refreshedSession = await refreshStoredSession(activeSession);
      if (!refreshedSession) {
        clearSession();
        return null;
      }
      activeSession = refreshedSession;
    }

    if (options.validateRemotely === false) {
      return activeSession;
    }

    const client = getSupabaseClient();
    const { data, error } = await client.auth.getUser(activeSession.token);

    if (error || !data.user) {
      clearSession();
      return null;
    }

    const profile = await getProfile(data.user.id);
    const validatedSession = { ...activeSession, user: buildUser(data.user, profile) };
    persistSession(validatedSession, rememberMe);
    return validatedSession;
  } catch {
    clearSession();
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/forgot-password`,
  });

  if (error) {
    throw new Error(translateAuthError(error.message));
  }
}
