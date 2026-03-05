import { NavLink } from 'react-router-dom';
import type { UserRole } from '../api/types';

type HamburgerMenuDrawerProps = {
  isOpen: boolean;
  userRole?: UserRole;
  onClose: () => void;
  onLogout: () => void;
};

export function HamburgerMenuDrawer({
  isOpen,
  userRole,
  onClose,
  onLogout,
}: HamburgerMenuDrawerProps) {
  return (
    <>
      {isOpen && <button className="drawer-overlay" onClick={onClose} aria-label="Fechar menu" type="button" />}
      <aside className={`hamburger-drawer ${isOpen ? 'open' : ''}`}>
        <nav>
          <NavLink to="/app" end className="drawer-link" onClick={onClose}>
            Imóveis
          </NavLink>

          <p className="drawer-section-title">Usuários</p>
          <NavLink to="/app/usuarios" className="drawer-link" onClick={onClose}>
            Consultar usuários
          </NavLink>
          {userRole === 'ADMIN' && (
            <NavLink to="/app/usuarios/novo" className="drawer-link" onClick={onClose}>
              Cadastrar usuário
            </NavLink>
          )}

          <button type="button" className="drawer-logout-btn" onClick={onLogout}>
            Sair
          </button>
        </nav>
      </aside>
    </>
  );
}
