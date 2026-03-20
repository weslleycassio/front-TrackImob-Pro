import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Building2, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Skeleton } from './ui/Skeleton';

type AppSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  isCompanyLoading?: boolean;
};

type NavItem = {
  label: string;
  to: string;
  description: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/app',
    description: 'Visao geral do negocio',
    icon: <LayoutDashboard size={20} aria-hidden="true" />,
  },
  {
    label: 'Imoveis',
    to: '/imoveis',
    description: 'Portfolio e captacao',
    icon: <Building2 size={20} aria-hidden="true" />,
  },
  {
    label: 'Usuarios',
    to: '/app/usuarios',
    description: 'Equipe e permissoes',
    icon: <Users size={20} aria-hidden="true" />,
  },
];

const getNavClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link';

function getCompanyInitials(name?: string | null) {
  if (!name) {
    return 'IM';
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AppSidebar({
  isOpen,
  onClose,
  onLogout,
  companyName,
  companyLogoUrl,
  isCompanyLoading = false,
}: AppSidebarProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const companyInitials = useMemo(() => getCompanyInitials(companyName), [companyName]);
  const shouldShowLogo = Boolean(companyLogoUrl && !logoFailed);

  useEffect(() => {
    setLogoFailed(false);
  }, [companyLogoUrl]);

  return (
    <>
      {isOpen ? <button type="button" className="app-sidebar__overlay" onClick={onClose} aria-label="Fechar menu" /> : null}
      <aside className={['app-sidebar', isOpen ? 'app-sidebar--open' : ''].filter(Boolean).join(' ')}>
        <div className="app-sidebar__brand">
          {isCompanyLoading ? (
            <>
              <Skeleton className="app-sidebar__brand-mark app-sidebar__brand-mark--skeleton" aria-hidden="true" />
              <div className="app-sidebar__brand-copy" aria-hidden="true">
                <Skeleton className="app-sidebar__brand-line" height={18} />
                <Skeleton className="app-sidebar__brand-line app-sidebar__brand-line--short" height={12} />
              </div>
            </>
          ) : (
            <>
              {shouldShowLogo ? (
                <img
                  className="app-sidebar__brand-mark app-sidebar__brand-logo"
                  src={companyLogoUrl ?? undefined}
                  alt={companyName ?? 'Imobiliaria'}
                  loading="lazy"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div className="app-sidebar__brand-mark" aria-hidden="true">
                  {companyInitials}
                </div>
              )}

              <div className="app-sidebar__brand-copy">
                <strong title={companyName ?? 'Imobiliaria'}>{companyName ?? 'Imobiliaria'}</strong>
                <span>Gestao imobiliaria</span>
              </div>
            </>
          )}
        </div>

        <nav className="app-sidebar__nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={getNavClassName} onClick={onClose}>
              <span className="app-sidebar__icon">{item.icon}</span>
              <span className="app-sidebar__text">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="app-sidebar__logout" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
          Sair
        </button>
      </aside>
    </>
  );
}
