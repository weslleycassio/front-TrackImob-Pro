type TopbarProps = {
  userLabel: string;
  onMenuToggle: () => void;
};

export function Topbar({ userLabel, onMenuToggle }: TopbarProps) {
  return (
    <header className="topbar-fixed">
      <button type="button" className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Abrir menu">
        ☰
      </button>
      <p className="topbar-user-label">{userLabel}</p>
    </header>
  );
}
