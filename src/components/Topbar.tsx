type TopbarProps = {
  userLabel: string;
  onMenuToggle: () => void;
};

export function Topbar({ userLabel, onMenuToggle }: TopbarProps) {
  return (
    <header className="topbar-fixed">
      <div className="topbar-left-content">
        <button type="button" className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Abrir menu">
          ☰
        </button>
        <p className="topbar-user-label">{userLabel}</p>
      </div>

      <button
        type="button"
        className="topbar-profile-btn"
        aria-label="Perfil do usuário"
        title="Perfil do usuário"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="topbar-profile-icon">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      </button>
    </header>
  );
}
