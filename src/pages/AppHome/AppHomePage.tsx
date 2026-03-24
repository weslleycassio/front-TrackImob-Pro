import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsersRequest } from '../../api/usersService';
import { useAuth } from '../../auth/useAuth';
import { useImobiliaria } from '../../hooks/useImobiliaria';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Spinner } from '../../components/ui/Spinner';
import { APP_NAME } from '../../config/app';
import { getImoveis } from '../../services/imoveisService';
import { toFriendlyError } from '../../utils/errorMessages';

type DashboardMetrics = {
  totalImoveis: number;
  imoveisAtivos: number;
  imoveisInativos: number;
  totalUsuarios: number;
};

const initialMetrics: DashboardMetrics = {
  totalImoveis: 0,
  imoveisAtivos: 0,
  imoveisInativos: 0,
  totalUsuarios: 0,
};

const metricLabels: Record<keyof DashboardMetrics, string> = {
  totalImoveis: 'Total de imoveis',
  imoveisAtivos: 'Imoveis ativos',
  imoveisInativos: 'Imoveis inativos',
  totalUsuarios: 'Usuarios',
};

const metricDescriptions: Record<keyof DashboardMetrics, string> = {
  totalImoveis: 'Panorama geral do portfolio imobiliario.',
  imoveisAtivos: 'Unidades prontas para operacao comercial.',
  imoveisInativos: 'Historico de oportunidades encerradas ou suspensas.',
  totalUsuarios: 'Equipe cadastrada na plataforma.',
};

const metricTones: Record<keyof DashboardMetrics, 'primary' | 'secondary' | 'dark' | 'neutral'> = {
  totalImoveis: 'primary',
  imoveisAtivos: 'secondary',
  imoveisInativos: 'neutral',
  totalUsuarios: 'dark',
};

const metricKeys: Array<keyof DashboardMetrics> = ['totalImoveis', 'imoveisAtivos', 'imoveisInativos', 'totalUsuarios'];

function getMetricChartBars(key: keyof DashboardMetrics, metrics: DashboardMetrics) {
  const totalReference = Math.max(metrics.totalImoveis, metrics.totalUsuarios, 1);
  const currentValue = metrics[key];
  const normalized = Math.max(18, Math.min(100, Math.round((currentValue / totalReference) * 100)));

  if (key === 'totalImoveis') {
    return [normalized, Math.max(28, normalized - 18), Math.max(20, normalized - 34)];
  }

  if (key === 'imoveisAtivos') {
    return [normalized, Math.max(32, normalized - 10), Math.max(22, normalized - 24)];
  }

  if (key === 'imoveisInativos') {
    return [Math.max(20, normalized - 12), normalized, Math.max(24, normalized - 18)];
  }

  return [Math.max(26, normalized - 22), Math.max(30, normalized - 8), normalized];
}

export function AppHomePage() {
  const { user } = useAuth();
  const { imobiliaria, loading: isLoadingImobiliaria } = useImobiliaria();
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [imoveisResponse, imoveisAtivosResponse, imoveisInativosResponse, usuariosResponse] = await Promise.all([
          getImoveis({ page: 1, limit: 1 }),
          getImoveis({ page: 1, limit: 1, status: 'ATIVO' }),
          getImoveis({ page: 1, limit: 1, status: 'INATIVO' }),
          getUsersRequest(),
        ]);

        setMetrics({
          totalImoveis: imoveisResponse.total ?? imoveisResponse.data.length,
          imoveisAtivos: imoveisAtivosResponse.total ?? imoveisAtivosResponse.data.length,
          imoveisInativos: imoveisInativosResponse.total ?? imoveisInativosResponse.data.length,
          totalUsuarios: usuariosResponse.total ?? usuariosResponse.data.length,
        });
      } catch (apiError) {
        setError(toFriendlyError(apiError, 'Nao foi possivel carregar os indicadores do dashboard.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoadingImobiliaria && !imobiliaria) {
    return (
      <main className="content-page">
        <section className="card imovel-detail-card">
          <div className="loading-state-card">
            <Spinner label="Carregando dados da imobiliaria..." />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="content-page">
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo de volta, ${user?.nome ?? 'equipe'}. Visualize a operacao da ${imobiliaria?.nome ?? APP_NAME} com mais clareza.`}
        actions={
          <div className="page-header__button-group">
            <Link to="/imoveis/cadastrar">
              <Button>Cadastrar imovel</Button>
            </Link>
            <Link to="/imoveis">
              <Button variant="secondary">Consultar carteira</Button>
            </Link>
          </div>
        }
      />

      {error ? <div className="global-error">{error}</div> : null}

      <section className="dashboard-metrics-grid">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="metric-card">
                <Skeleton height={16} className="metric-card__skeleton metric-card__skeleton--short" />
                <Skeleton height={34} className="metric-card__skeleton" />
                <Skeleton height={12} className="metric-card__skeleton metric-card__skeleton--short" />
              </Card>
            ))
          : metricKeys.map((key) => (
              <Card key={key} className="metric-card" title={metricLabels[key]}>
                <strong className="metric-card__value">{metrics[key]}</strong>
                <p className="metric-card__note">{metricDescriptions[key]}</p>
                <div className={['metric-card__chart', `metric-card__chart--${metricTones[key]}`].join(' ')}>
                  {getMetricChartBars(key, metrics).map((height, index) => (
                    <span key={`${key}-${index}`} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </Card>
            ))}
      </section>

      <section className="dashboard-grid">
        <Card
          title="Acoes rapidas"
          subtitle="Atalhos para as tarefas mais comuns da rotina."
          className="dashboard-grid__primary"
        >
          <div className="quick-action-grid">
            <Link to="/imoveis/cadastrar" className="quick-action-card">
              <strong>Novo imovel</strong>
              <span>Cadastre endereco, valores, caracteristicas e midia em um unico fluxo.</span>
            </Link>
            <Link to="/imoveis" className="quick-action-card">
              <strong>Consultar imoveis</strong>
              <span>Filtre a carteira, visualize detalhes e acompanhe o status da operacao.</span>
            </Link>
            <Link to="/app/usuarios" className="quick-action-card">
              <strong>Gerenciar equipe</strong>
              <span>Mantenha perfis, permissoes e disponibilidade da imobiliaria organizados.</span>
            </Link>
          </div>
        </Card>

        <Card title="Saude operacional" subtitle="Uma leitura rapida do momento atual da operacao.">
          {isLoading ? (
            <div className="dashboard-checklist">
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={18} />
            </div>
          ) : metrics.totalImoveis === 0 ? (
            <EmptyState
              title="Sem dados suficientes"
              description={`Assim que os primeiros imoveis forem cadastrados no ${APP_NAME}, os indicadores aparecerao aqui.`}
              action={
                <Link to="/imoveis/cadastrar">
                  <Button size="sm">Comecar agora</Button>
                </Link>
              }
            />
          ) : (
            <ul className="dashboard-checklist">
              <li>
                <strong>{metrics.imoveisAtivos}</strong>
                <span>imoveis ativos para atendimento e divulgacao.</span>
              </li>
              <li>
                <strong>{metrics.totalUsuarios}</strong>
                <span>usuarios participando da operacao atual.</span>
              </li>
              <li>
                <strong>{metrics.imoveisInativos}</strong>
                <span>registros inativos preservados para historico e analise.</span>
              </li>
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
