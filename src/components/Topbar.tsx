type TopbarProps = {
  userLabel: string;
  onMenuToggle: () => void;
  onRefreshUser: () => void;
};

export function Topbar({ userLabel, onMenuToggle, onRefreshUser }: TopbarProps) {
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
        aria-label="Atualizar dados do usuário"
        title="Atualizar dados do usuário"
        onClick={onRefreshUser}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="topbar-profile-icon">
          <path d="M20 6v5h-5" />
          <path d="M20 11a8 8 0 1 0 2.2 5.5" />
        </svg>
      </button>
    </header>
  );
}
