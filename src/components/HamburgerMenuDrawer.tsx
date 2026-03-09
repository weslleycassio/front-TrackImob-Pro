import { NavLink } from 'react-router-dom';

type HamburgerMenuDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const getDrawerLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'drawer-link active' : 'drawer-link');

export function HamburgerMenuDrawer({
  isOpen,
  onClose,
  onLogout,
}: HamburgerMenuDrawerProps) {
  return (
    <>
      {isOpen && <button className="drawer-overlay" onClick={onClose} aria-label="Fechar menu" type="button" />}
      <aside className={`hamburger-drawer ${isOpen ? 'open' : ''}`}>
        <nav>
          <p className="drawer-section-title">Imóveis</p>
          <NavLink to="/imoveis" end className={getDrawerLinkClass} onClick={onClose}>
            Consultar Imóveis
          </NavLink>
          <NavLink to="/imoveis/cadastrar" className={getDrawerLinkClass} onClick={onClose}>
            Cadastrar Imóvel
          </NavLink>

          <p className="drawer-section-title">Usuários</p>
          <NavLink to="/app/usuarios" className={getDrawerLinkClass} onClick={onClose}>
            Consultar usuários
          </NavLink>

          <button type="button" className="drawer-logout-btn" onClick={onLogout}>
            Sair
          </button>
        </nav>
      </aside>
    </>
  );
}
