import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="app-layout">
      <aside className="app-sidebar">
        <h2>TrackImob</h2>
        <nav>
          <NavLink to="/app" end className="sidebar-link">
            Imóveis
          </NavLink>
          {(user?.role === 'ADMIN' || user?.role === 'CORRETOR') && (
            <NavLink to="/app/users" className="sidebar-link">
              Usuários
            </NavLink>
          )}
        </nav>

        <button type="button" className="logout-btn" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <section className="app-main">
        <header className="topbar">
          <div>
            <strong>{user?.nome}</strong>
            <span>{user?.role}</span>
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
