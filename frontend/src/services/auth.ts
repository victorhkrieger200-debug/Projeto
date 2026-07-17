import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

const SESSION_STORAGE_KEY = 'atlhon-auth-session';
const EXPIRATION_SAFETY_WINDOW_MS = 60_000;
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') ||
  'http://localhost:4000';
const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao backend de autenticação. Inicie o projeto com `npm run dev` na raiz, confirme que o backend está rodando em http://localhost:4000 e confira as variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.';

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

interface ApiMeResponse {
  user?: ApiAuthUser;
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

function normalizeRole(role: ApiAuthUser['role']): AuthUser['role'] {
  return role === 'admin' ? 'admin' : 'user';
}

function normalizeUser(user: ApiAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email || 'Usuário',
    role: normalizeRole(user.role),
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  return response.json().catch(() => ({}) as T);
}

async function apiRequest<T extends { error?: string }>(
  path: string,
  init: RequestInit = {},
): Promise<T> {

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }


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

function createSession(authData: ApiAuthResponse, rememberMe = true): AuthSession {
  if (!authData.accessToken || !authData.user || !authData.expiresAt) {
    throw new Error(
      authData.requiresEmailConfirmation
        ? 'Conta criada. Confirme seu e-mail antes de entrar.'
        : 'Não foi possível iniciar a sessão com segurança.',
    );
  }

  return {
    user: normalizeUser(authData.user),
    token: authData.accessToken,
    refreshToken: authData.refreshToken ?? undefined,
    expiresAt: authData.expiresAt,
    rememberMe,
  };
}

function isSessionFresh(session: AuthSession) {
  return new Date(session.expiresAt).getTime() - EXPIRATION_SAFETY_WINDOW_MS > Date.now();
}

async function refreshStoredSession(session: AuthSession): Promise<AuthSession | null> {
  if (!session.refreshToken) return null;

  const data = await apiRequest<ApiAuthResponse>('/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const refreshedSession = createSession(data, session.rememberMe ?? true);
  persistSession(refreshedSession, refreshedSession.rememberMe);
  return refreshedSession;
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const rememberMe = input.rememberMe ?? true;
  const data = await apiRequest<ApiAuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email: input.email.trim(), password: input.password }),
  });

  const session = createSession(data, rememberMe);
  persistSession(session, rememberMe);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const rememberMe = input.rememberMe ?? true;
  const data = await apiRequest<ApiAuthResponse>('/register', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
    }),
  });

  const session = createSession(data, rememberMe);
  persistSession(session, rememberMe);
  return session;
}

export async function signOut(): Promise<void> {
  const session = await getSession({ validateRemotely: false });

  if (session?.token) {
    await apiRequest('/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    }).catch(() => undefined);
  }

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

    const data = await apiRequest<ApiMeResponse>('/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${activeSession.token}` },
    });

    if (data.user) {
      const validatedSession = { ...activeSession, user: normalizeUser(data.user) };
      persistSession(validatedSession, rememberMe);
      return validatedSession;
    }



    if (options.validateRemotely === false) {
      return activeSession;
    }

    const data = await apiRequest<ApiMeResponse>('/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${activeSession.token}` },
    });

    if (data.user) {
      const validatedSession = { ...activeSession, user: normalizeUser(data.user) };
      persistSession(validatedSession, rememberMe);
      return validatedSession;
    }

    clearSession();
    return null;
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