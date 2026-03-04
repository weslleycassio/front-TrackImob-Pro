import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';

type ImoveisOption = 'cadastrar' | 'editar' | 'consulta';

const menuItems: Array<{ key: ImoveisOption; label: string; description: string }> = [
  {
    key: 'cadastrar',
    label: 'Cadastro de imóveis',
    description: 'Cadastre novos imóveis com endereço, metragem, valor e características principais.',
  },
  {
    key: 'editar',
    label: 'Editar imóvel',
    description: 'Atualize dados de imóveis já cadastrados para manter as informações sempre corretas.',
  },
  {
    key: 'consulta',
    label: 'Consulta de imóveis',
    description: 'Consulte rapidamente o portfólio completo de imóveis registrados na plataforma.',
  },
];

export function DashboardPage() {
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ImoveisOption>('consulta');

  const selectedContent = menuItems.find((item) => item.key === selectedOption);

  const handleOptionSelect = (option: ImoveisOption) => {
    setSelectedOption(option);
    setIsMenuOpen(false);
  };

  return (
    <main className="app-shell">
      <button
        className="menu-toggle"
        type="button"
        aria-label="Abrir menu lateral"
        onClick={() => setIsMenuOpen((prevState) => !prevState)}
      >
        ☰
      </button>

      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Painel inicial</h2>
          <button className="secondary" onClick={logout} type="button">
            Sair
          </button>
        </div>

        <nav>
          <p className="menu-title">Imóveis</p>
          <ul className="submenu-list">
            {menuItems.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={`submenu-item ${selectedOption === item.key ? 'active' : ''}`}
                  onClick={() => handleOptionSelect(item.key)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section className="content-area">
        <h1>Página inicial pós-login</h1>
        <p>
          Você está no módulo <strong>Imóveis</strong>. Navegue pelo menu lateral para acessar as funcionalidades.
        </p>

        <article className="feature-card">
          <h3>{selectedContent?.label}</h3>
          <p>{selectedContent?.description}</p>
        </article>
      </section>
    </main>
  );
}
