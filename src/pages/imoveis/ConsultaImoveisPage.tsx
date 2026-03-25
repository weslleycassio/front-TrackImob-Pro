import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../../api/types';
import { getBrokerAndAdminUsersRequest } from '../../api/usersService';
import { useAuth } from '../../auth/useAuth';
import { InativarImovelModal } from '../../components/imoveis/InativarImovelModal';
import { ImoveisFiltro } from '../../components/imoveis/ImoveisFiltro';
import { ImoveisPaginacao } from '../../components/imoveis/ImoveisPaginacao';
import { ImoveisTabela } from '../../components/imoveis/ImoveisTabela';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';
import { APP_NAME } from '../../config/app';
import {
  ativarImovel,
  getImoveis,
  inativarImovel,
  type GetImoveisFilters,
  type InternalImovel,
  type InativarImovelPayload,
} from '../../services/imoveisService';
import { toFriendlyError, toImovelActionError } from '../../utils/errorMessages';
import { canEditImovel, canManageImovel } from '../../utils/imovelPermissions';
import { canActivateImovel } from '../../utils/imovelStatus';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const normalizeTextFilter = (value?: string) => value?.trim().replace(/\s+/g, ' ') ?? '';

function mapSearchParamsToFilters(searchParams: URLSearchParams): GetImoveisFilters {
  return {
    busca: searchParams.get('busca') ?? '',
    cidade: searchParams.get('cidade') ?? '',
    bairro: searchParams.get('bairro') ?? '',
    tipo: searchParams.get('tipo') ?? '',
    finalidade: searchParams.get('finalidade') ?? '',
    status: searchParams.get('status') ?? '',
    precoMin: searchParams.get('precoMin') ? Number(searchParams.get('precoMin')) : undefined,
    precoMax: searchParams.get('precoMax') ? Number(searchParams.get('precoMax')) : undefined,
    page: Number(searchParams.get('page') ?? DEFAULT_PAGE),
    limit: Number(searchParams.get('limit') ?? DEFAULT_LIMIT),
  };
}

export function ConsultaImoveisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [imoveis, setImoveis] = useState<InternalImovel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [selectedImovel, setSelectedImovel] = useState<InternalImovel | null>(null);
  const [isInactivating, setIsInactivating] = useState(false);
  const [activatingImovelId, setActivatingImovelId] = useState<string | number | null>(null);
  const [inactivationError, setInactivationError] = useState<string | null>(null);
  const [usuariosFechamento, setUsuariosFechamento] = useState<User[]>([]);
  const [isLoadingUsuariosFechamento, setIsLoadingUsuariosFechamento] = useState(false);
  const [usuariosFechamentoError, setUsuariosFechamentoError] = useState<string | null>(null);

  const filters = useMemo(() => mapSearchParamsToFilters(searchParams), [searchParams]);

  const loadImoveis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getImoveis(filters);
      setImoveis(response.data ?? []);
      setTotal(response.total);
    } catch (apiError) {
      setError(toFriendlyError(apiError, 'Nao foi possivel carregar os imoveis.'));
      setImoveis([]);
      setTotal(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadImoveis();
  }, [loadImoveis]);

  const updateParams = (nextFilters: GetImoveisFilters) => {
    const nextParams = new URLSearchParams();

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      const normalizedValue = key === 'busca' && typeof value === 'string' ? normalizeTextFilter(value) : value;

      if (normalizedValue === '') {
        return;
      }

      nextParams.set(key, String(normalizedValue));
    });

    if (!nextParams.has('page')) {
      nextParams.set('page', String(DEFAULT_PAGE));
    }

    if (!nextParams.has('limit')) {
      nextParams.set('limit', String(DEFAULT_LIMIT));
    }

    setSearchParams(nextParams);
  };

  const handleFilter = (nextFilters: GetImoveisFilters) => {
    updateParams({
      ...nextFilters,
      page: DEFAULT_PAGE,
      limit: filters.limit || DEFAULT_LIMIT,
    });
  };

  const handleClear = () => {
    setSearchParams({
      page: String(DEFAULT_PAGE),
      limit: String(DEFAULT_LIMIT),
    });
  };

  const handleChangePage = (nextPage: number) => {
    if (nextPage < 1) {
      return;
    }

    updateParams({
      ...filters,
      page: nextPage,
      limit: filters.limit || DEFAULT_LIMIT,
    });
  };

  const canInativarImovel = (imovel: InternalImovel) => {
    return canManageImovel(user, imovel);
  };

  const loadUsuariosFechamento = useCallback(async () => {
    setIsLoadingUsuariosFechamento(true);
    setUsuariosFechamentoError(null);

    try {
      const usuarios = await getBrokerAndAdminUsersRequest();
      setUsuariosFechamento(usuarios);
    } catch (apiError) {
      setUsuariosFechamento([]);
      setUsuariosFechamentoError(
        toFriendlyError(apiError, 'Nao foi possivel carregar os usuarios para o fechamento do imovel.'),
      );
    } finally {
      setIsLoadingUsuariosFechamento(false);
    }
  }, []);

  const openInactivationModal = (imovel: InternalImovel) => {
    setSuccessMessage(null);
    setInactivationError(null);
    setSelectedImovel(imovel);

    if (!usuariosFechamento.length && !isLoadingUsuariosFechamento) {
      loadUsuariosFechamento();
    }
  };

  const handleAtivarImovel = async (imovel: InternalImovel) => {
    setSuccessMessage(null);
    setError(null);
    setActivatingImovelId(imovel.id);

    try {
      await ativarImovel(imovel.id);
      setSuccessMessage('Imovel ativado com sucesso.');
      await loadImoveis();
    } catch (apiError) {
      setError(toImovelActionError(apiError, 'Nao foi possivel ativar o imovel. Tente novamente.'));
    } finally {
      setActivatingImovelId(null);
    }
  };

  const closeInactivationModal = () => {
    if (isInactivating) {
      return;
    }

    setSelectedImovel(null);
    setInactivationError(null);
  };

  const handleConfirmInactivation = async (payload: InativarImovelPayload) => {
    if (!selectedImovel) {
      return;
    }

    setSuccessMessage(null);
    setInactivationError(null);
    setIsInactivating(true);

    try {
      await inativarImovel(selectedImovel.id, payload);
      setSuccessMessage('Imovel inativado com sucesso.');
      setSelectedImovel(null);

      const currentPage = filters.page || DEFAULT_PAGE;
      const shouldGoToPreviousPage = currentPage > 1 && imoveis.length === 1;

      if (shouldGoToPreviousPage) {
        updateParams({
          ...filters,
          page: currentPage - 1,
          limit: filters.limit || DEFAULT_LIMIT,
        });
      } else {
        await loadImoveis();
      }
    } catch (apiError) {
      setInactivationError(toImovelActionError(apiError, 'Nao foi possivel inativar o imovel. Tente novamente.'));
    } finally {
      setIsInactivating(false);
    }
  };

  return (
    <main className="content-page">
      <PageHeader
        title="Imoveis"
        subtitle="Gerencie a carteira com filtros mais claros, cards organizados e acoes padronizadas."
        actions={<Button onClick={() => navigate('/imoveis/cadastrar')}>Cadastrar imovel</Button>}
      />

      {successMessage ? (
        <div className="toast-stack">
          <Toast
            title="Carteira atualizada"
            description={successMessage}
            variant="success"
            onClose={() => setSuccessMessage(null)}
          />
        </div>
      ) : null}

      <ImoveisFiltro initialFilters={filters} onFilter={handleFilter} onClear={handleClear} />

      <Card
        className="imoveis-list-card"
        title="Carteira cadastrada"
        subtitle={typeof total === 'number' ? `${total} registro(s) encontrados.` : 'Acompanhe os imoveis encontrados abaixo.'}
      >
        {isLoading ? (
          <div className="imoveis-skeleton-grid" aria-live="polite" aria-label="Carregando carteira de imoveis">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="imoveis-skeleton-card">
                <Skeleton className="imoveis-skeleton-image" />
                <Skeleton height={18} className="imoveis-skeleton-line" />
                <Skeleton height={12} className="imoveis-skeleton-line short" />
                <Skeleton height={12} className="imoveis-skeleton-line" />
              </Card>
            ))}
          </div>
        ) : null}

        {!isLoading && error ? <div className="global-error">{error}</div> : null}

        {!isLoading && !error && imoveis.length === 0 ? (
          <EmptyState
            title="Nenhum imovel encontrado"
            description={`Ajuste os filtros ou cadastre o primeiro imóvel no ${APP_NAME} para iniciar sua carteira.`}
            action={<Button onClick={() => navigate('/imoveis/cadastrar')}>Novo imovel</Button>}
          />
        ) : null}

        {!isLoading && !error && imoveis.length > 0 ? (
          <>
            <ImoveisTabela
              imoveis={imoveis}
              formatCurrency={(value) => currencyFormatter.format(value)}
              formatDate={(date) => (date ? dateFormatter.format(new Date(date)) : '-')}
              canEdit={(imovel) => canEditImovel(user, imovel)}
              canActivate={(imovel) => canInativarImovel(imovel) && canActivateImovel(imovel)}
              canInativar={(imovel) => canInativarImovel(imovel) && String(imovel.status).toUpperCase() !== 'INATIVO'}
              activatingImovelId={activatingImovelId}
              onVisualizar={(imovel) => navigate(`/imoveis/${imovel.id}`)}
              onEditar={(imovel) => navigate(`/imoveis/${imovel.id}/editar`)}
              onAtivar={handleAtivarImovel}
              onInativar={openInactivationModal}
            />
            <ImoveisPaginacao
              page={filters.page || DEFAULT_PAGE}
              limit={filters.limit || DEFAULT_LIMIT}
              total={total}
              onChangePage={handleChangePage}
            />
          </>
        ) : null}
      </Card>

      <InativarImovelModal
        imovel={selectedImovel}
        usuariosFechamento={usuariosFechamento}
        isLoadingUsuariosFechamento={isLoadingUsuariosFechamento}
        usuariosFechamentoError={usuariosFechamentoError}
        isSubmitting={isInactivating}
        error={inactivationError}
        onCancel={closeInactivationModal}
        onConfirm={handleConfirmInactivation}
      />
    </main>
  );
}
