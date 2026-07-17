import { supabase, supabaseAdmin } from '../lib/supabase.js';

function buildUser(authUser, profile = {}) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile.full_name || authUser.user_metadata?.full_name || authUser.email,
    role: profile.role || 'user',
  };
}

function getPublicAppUrl(req) {
  return process.env.PUBLIC_APP_URL || req.headers.origin || 'http://localhost:5173';
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({ error: authError?.message || 'Credenciais inválidas.' });
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ error: 'Não foi possível carregar o perfil do usuário.' });
    }

    return res.status(200).json({
      user: buildUser(authData.user, profileData),
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresAt: new Date(authData.session.expires_at * 1000).toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
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
      return res.status(400).json({ error: authError?.message || 'Não foi possível criar a conta.' });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: authData.user.id, full_name: name, role: 'user' }, { onConflict: 'id' });

    if (profileError) {
      return res.status(500).json({ error: 'Conta criada, mas não foi possível salvar o perfil.' });
    }

    return res.status(201).json({
      user: buildUser(authData.user, { full_name: name, role: 'user' }),
      accessToken: authData.session?.access_token ?? null,
      refreshToken: authData.session?.refresh_token ?? null,
      expiresAt: authData.session?.expires_at
        ? new Date(authData.session.expires_at * 1000).toISOString()
        : null,
      requiresEmailConfirmation: !authData.session,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getPublicAppUrl(req)}/forgot-password`,
    });

    if (error) {
      return res.status(400).json({ error: error.message || 'Não foi possível enviar o e-mail.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
