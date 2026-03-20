import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

export function CRMPage() {
  return (
    <main className="content-page">
      <PageHeader
        title="CRM"
        subtitle="Organize oportunidades, acompanhe contatos e mantenha a operacao comercial mais previsivel."
      />

      <Card
        title="Modulo em evolucao"
        subtitle="A base visual ja esta preparada para receber pipeline, agenda e historico de interacoes."
      >
        <p className="saas-copy">
          Este espaco foi preparado para a proxima etapa do sistema, mantendo o novo padrao visual e a navegacao principal.
        </p>
      </Card>
    </main>
  );
}
