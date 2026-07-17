import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <main style={{ minHeight: '100vh', padding: '32px', background: '#020617', color: '#f8fafc' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px', borderRadius: '24px', background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ margin: 0, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '12px' }}>
          Área protegida
        </p>
        <h1 style={{ margin: '10px 0 12px', fontSize: '32px' }}>Bem-vindo ao painel</h1>
        <p style={{ lineHeight: 1.7, color: '#cbd5e1' }}>
          Você está autenticado com sucesso. A partir daqui, o backend pode ser conectado sem reestruturar o fluxo.
        </p>

        <div style={{ marginTop: '24px', padding: '16px 18px', borderRadius: '16px', background: '#111827' }}>
          <strong>Usuário:</strong> {user?.name ?? 'Carregando...'}
          <br />
          <strong>E-mail:</strong> {user?.email ?? 'Carregando...'}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void signOut()}
            style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontWeight: 600 }}
          >
            Sair
          </button>
          <Link
            to="/"
            style={{ padding: '12px 16px', borderRadius: '12px', background: '#1d4ed8', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
          >
            Voltar para login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
