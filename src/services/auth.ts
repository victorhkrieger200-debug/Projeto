import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function persistSession(session: AuthSession) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(SESSION_STORAGE_KEY);
}

function createSession(user: AuthUser, token: string): AuthSession {
  return {
    user,
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Credenciais inválidas.');
  }

  const session = createSession(data.user as AuthUser, data.accessToken);
  persistSession(session);
  return session;
}

export async function signUp(_input: SignUpInput): Promise<AuthSession> {
  throw new Error('Cadastro será implementado no backend em seguida.');
}

export async function signOut(): Promise<void> {
  clearSession();
}

export async function getSession(): Promise<AuthSession | null> {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    clearSession();
    return null;
  }
}

export async function requestPasswordReset(_email: string): Promise<void> {
  throw new Error('Recuperação de senha será implementada no backend em seguida.');
}
