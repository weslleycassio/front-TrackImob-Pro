import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

export function SettingsPage() {
  return (
    <main className="content-page">
      <PageHeader
        title="Configuracoes"
        subtitle="Centralize dados da operacao, politicas internas e preferencias visuais do sistema."
      />

      <Card
        title="Base pronta para configuracoes"
        subtitle="O shell principal e os componentes agora suportam um modulo administrativo mais completo."
      >
        <p className="saas-copy">
          Este ambiente pode evoluir para preferencias da imobiliaria, notificacoes, branding e permissoes avancadas.
        </p>
      </Card>
    </main>
  );
}
