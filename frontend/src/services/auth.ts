import { supabaseConfig } from '@/lib/supabase';
import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';

interface SupabaseAuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: SupabaseAuthUser;
  msg?: string;
  error?: string;
  error_description?: string;
}

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

function getAuthErrorMessage(data: SupabaseAuthResponse, fallback: string) {
  return data.error_description || data.msg || data.error || fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  return response.json().catch(() => ({} as T));
}

async function supabaseAuthRequest<T extends SupabaseAuthResponse>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${supabaseConfig.url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: supabaseConfig.anonKey,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const data = await parseJson<T>(response);

  if (!response.ok) {
    throw new Error(getAuthErrorMessage(data, 'Não foi possível completar a solicitação.'));
  }

  return data;
}

async function supabaseRestRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${supabaseConfig.url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const data = await parseJson<T>(response);

  if (!response.ok) {
    throw new Error('Login validado, mas não foi possível sincronizar o perfil do usuário.');
  }

  return data;
}

async function getProfile(userId: string, accessToken: string): Promise<ProfileRow | null> {
  const data = await supabaseRestRequest<ProfileRow[]>(
    `/profiles?select=id,full_name,role&id=eq.${encodeURIComponent(userId)}&limit=1`,
    accessToken,
  );

  return data[0] ?? null;
}

async function upsertProfile(userId: string, fullName: string, accessToken: string) {
  await supabaseRestRequest('/profiles', accessToken, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: userId, full_name: fullName, role: 'user' }),
  });
}

async function createSession(authData: SupabaseAuthResponse): Promise<AuthSession> {
  if (!authData.access_token || !authData.user) {
    throw new Error('O Supabase não retornou uma sessão válida.');
  }

  const profile = await getProfile(authData.user.id, authData.access_token);

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email ?? '',
      name: profile?.full_name || authData.user.user_metadata?.full_name || authData.user.email || 'Usuário',
      role: normalizeRole(profile?.role ?? null),
    },
    token: authData.access_token,
    refreshToken: authData.refresh_token,
    expiresAt: new Date(
      (authData.expires_at ?? Math.floor(Date.now() / 1000) + (authData.expires_in ?? 3600)) * 1000,
    ).toISOString(),
  };
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const data = await supabaseAuthRequest<SupabaseAuthResponse>('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: input.email.trim(), password: input.password }),
  });

  const session = await createSession(data);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const fullName = input.name.trim();
  const data = await supabaseAuthRequest<SupabaseAuthResponse>('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      data: { full_name: fullName },
      gotrue_meta_security: {},
    }),
  });

  if (!data.access_token || !data.user) {
    throw new Error('Conta criada. Confirme seu e-mail antes de entrar.');
  }

  await upsertProfile(data.user.id, fullName, data.access_token);
  const session = await createSession(data);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signOut(): Promise<void> {
  const currentSession = await getSession();

  if (currentSession?.token) {
    await supabaseAuthRequest('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentSession.token}`,
      },
    }).catch(() => undefined);
  }

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
  await supabaseAuthRequest('/recover', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      redirect_to: `${window.location.origin}/forgot-password`,
    }),
  });
}
