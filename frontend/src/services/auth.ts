import type { AuthSession, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') ||
  'http://localhost:4000';

interface ApiAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
}

interface ApiAuthResponse {
  user?: ApiAuthUser;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  requiresEmailConfirmation?: boolean;
  error?: string;
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

function normalizeRole(role: ApiAuthUser['role']): AuthSession['user']['role'] {
  return role === 'admin' ? 'admin' : 'user';
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  return response.json().catch(() => ({}) as T);
}

async function apiRequest<T extends ApiAuthResponse>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const data = await parseJson<T>(response);

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível completar a solicitação.');
  }

  return data;
}

function createSession(authData: ApiAuthResponse): AuthSession {
  if (!authData.accessToken || !authData.user || !authData.expiresAt) {
    throw new Error(
      authData.requiresEmailConfirmation
        ? 'Conta criada. Confirme seu e-mail antes de entrar.'
        : 'Não foi possível iniciar a sessão com segurança.',
    );
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.name || authData.user.email || 'Usuário',
      role: normalizeRole(authData.user.role),
    },
    token: authData.accessToken,
    refreshToken: authData.refreshToken ?? undefined,
    expiresAt: authData.expiresAt,
  };
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const data = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ email: input.email.trim(), password: input.password }),
  });

  const session = createSession(data);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const data = await apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
    }),
  });

  const session = createSession(data);
  persistSession(session, input.rememberMe ?? true);
  return session;
}

export async function signOut(): Promise<void> {
  clearSession();
}

export async function getSession(): Promise<AuthSession | null> {
  if (typeof window === 'undefined') return null;

  const raw =
    window.localStorage.getItem(SESSION_STORAGE_KEY) ??
    window.sessionStorage.getItem(SESSION_STORAGE_KEY);
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
  await apiRequest('/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}
