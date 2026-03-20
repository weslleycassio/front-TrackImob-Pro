import { useEffect, type ReactNode } from 'react';
import logoWbg from '../assets/wbg-logo.svg';
import { APP_DESCRIPTION, APP_NAME, setDocumentTitle } from '../config/app';
import { AppFooter } from './AppFooter';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  useEffect(() => {
    setDocumentTitle();
  }, []);

  return (
    <main className="auth-layout">
      <section className="auth-shell auth-shell--split">
        <aside className="auth-brand-panel">
          <div className="auth-brand-panel__content">
            <span className="auth-brand-panel__eyebrow">{APP_NAME}</span>
            <h1>Gestão imobiliária com presença mais premium, organizada e confiável.</h1>
            <p>{APP_DESCRIPTION}</p>

            <div className="auth-brand-panel__highlights">
              <div>
                <strong>Layout corporativo</strong>
                <span>Estrutura visual mais solida para uso diario da equipe.</span>
              </div>
              <div>
                <strong>Fluxos mais claros</strong>
                <span>Cadastros, listagens e acoes com hierarquia visual bem definida.</span>
              </div>
              <div>
                <strong>Base pronta para evoluir</strong>
                <span>Componentes reutilizaveis para expandir o produto com consistencia.</span>
              </div>
            </div>
          </div>

        </aside>

        <section className="auth-content-panel">
          <img className="auth-logo" src={logoWbg} alt={APP_NAME} />
          {children}
          <AppFooter />
        </section>
      </section>
    </main>
  );
}
