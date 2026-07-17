import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <main className="dashboard-shell">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-brand">
            <div className="dashboard-logo" aria-hidden="true">
              A
            </div>
            <div>
              <p className="dashboard-eyebrow">Atlhon Sales</p>
              <h1 className="dashboard-title">Painel profissional</h1>
            </div>
          </div>
          <div className="dashboard-actions">
            <Link className="dashboard-link" to="/">
              Login
            </Link>
            <button className="dashboard-button" type="button" onClick={() => void handleSignOut()}>
              Sair com segurança
            </button>
          </div>
        </header>

        <section className="dashboard-grid" aria-label="Resumo da conta">
          <div className="dashboard-card dashboard-hero">
            <p className="dashboard-eyebrow">Área protegida</p>
            <h2 className="dashboard-title">Bem-vindo, {user?.name ?? 'usuário'}.</h2>
            <p>
              Sua sessão foi validada pelo backend e protegida pelo Supabase. Este painel está
              pronto para receber módulos de CRM, gestão de alunos, funil comercial, métricas e
              permissões por perfil.
            </p>

            <div className="dashboard-stats">
              <div className="dashboard-stat">
                <strong>100%</strong>
                <span>Autenticação protegida</span>
              </div>
              <div className="dashboard-stat">
                <strong>RLS</strong>
                <span>Perfis isolados no Supabase</span>
              </div>
              <div className="dashboard-stat">
                <strong>JWT</strong>
                <span>Sessão renovável e validada</span>
              </div>
            </div>
          </div>

          <aside className="dashboard-card dashboard-profile">
            <h2>Conta conectada</h2>
            <div className="profile-row">
              <span>Nome</span>
              <strong>{user?.name ?? 'Carregando...'}</strong>
            </div>
            <div className="profile-row">
              <span>E-mail</span>
              <strong>{user?.email ?? 'Carregando...'}</strong>
            </div>
            <div className="profile-row">
              <span>Perfil</span>
              <strong>{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</strong>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
