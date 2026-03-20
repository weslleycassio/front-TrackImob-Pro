import { Menu } from 'lucide-react';

type AppHeaderProps = {
  companyName: string;
  userName: string;
  userRole: string;
  onOpenSidebar: () => void;
  onProfileClick: () => void;
};

export function AppHeader({ companyName, userName, userRole, onOpenSidebar, onProfileClick }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <button type="button" className="app-header__menu" onClick={onOpenSidebar} aria-label="Abrir menu lateral">
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="app-header__context">
          <span className="app-header__eyebrow">{companyName}</span>
          <strong>{userName}</strong>
        </div>
      </div>

      <button type="button" className="app-header__profile" onClick={onProfileClick}>
        <span className="app-header__profile-copy">
          <strong>{userName}</strong>
          <small>{userRole}</small>
        </span>
        <span className="app-header__avatar" aria-hidden="true">
          {userName.slice(0, 1).toUpperCase()}
        </span>
      </button>
    </header>
  );
}
