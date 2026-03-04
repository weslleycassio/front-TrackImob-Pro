import { useAuth } from '../../auth/useAuth';

export function DashboardPage() {
  const { logout } = useAuth();

  return (
    <main className="dashboard">
      <section className="dashboard-card">
        <div className="row">
          <h1>Dashboard</h1>
          <button className="secondary" onClick={logout} type="button">
            Sair
          </button>
        </div>
        <p>Área protegida (placeholder inicial do frontend BTImoveis).</p>
      </section>
    </main>
  );
}
