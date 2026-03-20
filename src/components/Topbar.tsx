import { CircleUserRound, Menu } from 'lucide-react';

type TopbarProps = {
  userLabel: string;
  onMenuToggle: () => void;
  onProfileClick: () => void;
};

export function Topbar({ userLabel, onMenuToggle, onProfileClick }: TopbarProps) {
  return (
    <header className="topbar-fixed">
      <div className="topbar-left-content">
        <button type="button" className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Abrir menu">
          <Menu size={20} aria-hidden="true" />
        </button>
        <p className="topbar-user-label">{userLabel}</p>
      </div>

      <button
        type="button"
        className="topbar-profile-btn"
        aria-label="Editar perfil do usuario"
        title="Editar perfil do usuario"
        onClick={onProfileClick}
      >
        <CircleUserRound aria-hidden="true" className="topbar-profile-icon" />
      </button>
    </header>
  );
}
