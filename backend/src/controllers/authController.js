import {
  isSupabaseConfigured,
  missingSupabaseEnvVars,
  supabase,
  supabaseAdmin,
} from '../lib/supabase.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 120;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) : '';
}

function validateEmail(email) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

function ensureSupabaseConfigured(res) {
  if (isSupabaseConfigured) return true;

  res.status(503).json({
    error: `Autenticação temporariamente indisponível. Configure ${missingSupabaseEnvVars.join(
      ', ',
    )} no backend e reinicie o servidor.`,
  });
  return false;
}

function buildUser(authUser, profile = {}) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
    role: profile?.role === 'admin' ? 'admin' : 'user',
  };
}

function buildSessionResponse(authData, profile) {
  return {
    user: buildUser(authData.user, profile),
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
    expiresAt: new Date(authData.session.expires_at * 1000).toISOString(),
  };
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : '';
}

function getPublicAppUrl(req) {
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  return configuredUrl || req.headers.origin || 'http://localhost:5173';
}

function safeLog(message, error) {
  console.error(message, {
    code: error?.code,
    status: error?.status,
    name: error?.name,
  });
}

async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    safeLog('Falha ao consultar perfil.', error);
    return null;
  }

  return data;
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    return { error: 'Sessão ausente ou expirada.' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return { error: 'Sessão inválida ou expirada.' };
  }

  return { user: data.user, token };
}

export async function login(req, res) {
  try {
    if (!ensureSupabaseConfigured(res)) return;

    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!validateEmail(email) || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const profile = await getProfile(authData.user.id);

    return res.status(200).json(buildSessionResponse(authData, profile));
  } catch (error) {
    safeLog('Erro inesperado no login.', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function register(req, res) {
  try {
    if (!ensureSupabaseConfigured(res)) return;

    const name = normalizeName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !validateEmail(email) || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.',
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${getPublicAppUrl(req)}/dashboard`,
      },
    });

    if (authError || !authData.user) {
      safeLog('Falha ao criar usuário no provedor de autenticação.', authError);
      return res.status(400).json({ error: 'Não foi possível criar a conta.' });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: authData.user.id, full_name: name, role: 'user' }, { onConflict: 'id' });

    if (profileError) {
      safeLog('Falha ao sincronizar perfil após cadastro.', profileError);
      return res.status(500).json({ error: 'Conta criada, mas o perfil não foi sincronizado.' });
    }

    if (!authData.session) {
      return res.status(201).json({
        user: buildUser(authData.user, { full_name: name, role: 'user' }),
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        requiresEmailConfirmation: true,
      });
    }

    return res.status(201).json(buildSessionResponse(authData, { full_name: name, role: 'user' }));
  } catch (error) {
    safeLog('Erro inesperado no cadastro.', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function me(req, res) {
  try {
    if (!ensureSupabaseConfigured(res)) return;

    const { user, error } = await getAuthenticatedUser(req);

    if (error) {
      return res.status(401).json({ error });
    }

    const profile = await getProfile(user.id);
    return res.status(200).json({ user: buildUser(user, profile) });
  } catch (error) {
    safeLog('Erro inesperado ao validar sessão.', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function refreshSession(req, res) {
  try {
    if (!ensureSupabaseConfigured(res)) return;

    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório.' });
    }

    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
    }

    const profile = await getProfile(authData.user.id);
    return res.status(200).json(buildSessionResponse(authData, profile));
  } catch (error) {
    safeLog('Erro inesperado ao renovar sessão.', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function logout(req, res) {
  try {
    if (!ensureSupabaseConfigured(res)) return;

    const token = getBearerToken(req);

    if (token) {
      const { error } = await supabaseAdmin.auth.admin.signOut(token, 'local');

      if (error) {
        safeLog('Falha ao encerrar sessão no Supabase.', error);
      }
    }

    return res.status(204).send();
  } catch (error) {
    safeLog('Erro inesperado no logout.', error);
    return res.status(204).send();
  }
}

export async function requestPasswordReset(req, res) {
  try {
    if (!ensureSupabaseConfigured(res)) return;

    const email = normalizeEmail(req.body?.email);

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getPublicAppUrl(req)}/forgot-password`,
    });

    if (error) {
      safeLog('Falha ao solicitar redefinição de senha.', error);
    }

    return res.status(204).send();
  } catch (error) {
    safeLog('Erro inesperado na redefinição de senha.', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
