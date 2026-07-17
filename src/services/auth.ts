import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

interface AuthResponse {
  user: AuthUser;
  accessToken: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  requiresEmailConfirmation?: boolean;
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

function createSession(data: AuthResponse): AuthSession {
  if (!data.accessToken) {
    throw new Error(
      data.requiresEmailConfirmation
        ? 'Conta criada. Confirme seu e-mail antes de entrar.'
        : 'O Supabase não retornou uma sessão válida.',
    );
  }

  return {
    user: data.user,
    token: data.accessToken,
    refreshToken: data.refreshToken ?? undefined,
    expiresAt: data.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  };
}

async function parseApiResponse(response: Response) {
  if (response.status === 204) return {};

  return response.json().catch(() => ({}));
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível completar a solicitação.');
  }

  return data as T;
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const data = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, password: input.password }),
  });

  const session = createSession(data);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const data = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: input.name, email: input.email, password: input.password }),
  });

  const session = createSession(data);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signOut(): Promise<void> {
  clearSession();
}

export async function getSession(): Promise<AuthSession | null> {
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
  await request('/api/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
