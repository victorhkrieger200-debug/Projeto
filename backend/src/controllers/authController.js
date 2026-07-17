import { supabase } from '../lib/supabase.js';

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

    if (authError || !authData.user) {
      return res.status(401).json({ error: authError?.message || 'Credenciais inválidas.' });
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      return res.status(403).json({ error: 'Usuário não encontrado no banco.' });
    }

    return res.status(200).json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profileData.full_name || authData.user.email,
      },
      accessToken: authData.session?.access_token,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
