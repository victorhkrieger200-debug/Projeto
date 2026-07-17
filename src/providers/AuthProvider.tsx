import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSession, requestPasswordReset, signIn, signOut, signUp } from '@/services/auth';
import type { AuthSession, AuthUser, SignInInput, SignUpInput } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeSession() {
      const currentSession = await getSession();
      setSession(currentSession);
      setIsLoading(false);
    }

    void initializeSession();
  }, []);

  const handleSignIn = useCallback(async (input: SignInInput) => {
    setIsLoading(true);
    try {
      const nextSession = await signIn(input);
      setSession(nextSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignUp = useCallback(async (input: SignUpInput) => {
    setIsLoading(true);
    try {
      const nextSession = await signUp(input);
      setSession(nextSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePasswordReset = useCallback(async (email: string) => {
    await requestPasswordReset(email);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session),
      isLoading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      requestPasswordReset: handlePasswordReset,
    }),
    [handlePasswordReset, handleSignIn, handleSignOut, handleSignUp, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
