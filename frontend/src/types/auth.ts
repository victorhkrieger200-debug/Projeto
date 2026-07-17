export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  refreshToken?: string;
  expiresAt: string;
  rememberMe?: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpInput extends SignInInput {
  name: string;
}
