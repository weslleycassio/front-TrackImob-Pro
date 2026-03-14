import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../../api/types';
import { getBrokerAndAdminUsersRequest } from '../../api/usersService';
import { InativarImovelModal } from '../../components/imoveis/InativarImovelModal';
import { ImoveisFiltro } from '../../components/imoveis/ImoveisFiltro';
import { ImoveisPaginacao } from '../../components/imoveis/ImoveisPaginacao';
import { ImoveisTabela } from '../../components/imoveis/ImoveisTabela';
import {
  getImoveis,
  inativarImovel,
  type GetImoveisFilters,
  type Imovel,
  type InativarImovelPayload,
} from '../../services/imoveisService';
import { useAuth } from '../../auth/useAuth';
import { toFriendlyError } from '../../utils/errorMessages';

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
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [selectedImovel, setSelectedImovel] = useState<Imovel | null>(null);
  const [isInactivating, setIsInactivating] = useState(false);
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
    } catch {
      setError('Não foi possível carregar os imóveis');
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
      if (value === undefined || value === null || value === '') return;
      nextParams.set(key, String(value));
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
    if (nextPage < 1) return;

    updateParams({
      ...filters,
      page: nextPage,
      limit: filters.limit || DEFAULT_LIMIT,
    });
  };

  const canInativarImovel = (imovel: Imovel) => {
    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    if (imovel.responsavelId === undefined || imovel.responsavelId === null) {
      return false;
    }

    return String(imovel.responsavelId) === String(user.id);
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
        toFriendlyError(apiError, 'Não foi possível carregar os usuários para o fechamento do imóvel.'),
      );
    } finally {
      setIsLoadingUsuariosFechamento(false);
    }
  }, []);

  const openInactivationModal = (imovel: Imovel) => {
    setSuccessMessage(null);
    setInactivationError(null);
    setSelectedImovel(imovel);

    if (!usuariosFechamento.length && !isLoadingUsuariosFechamento) {
      loadUsuariosFechamento();
    }
  };

  const handleVisualizarImovel = (imovel: Imovel) => {
    navigate(`/imoveis/${imovel.id}`);
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
      setSuccessMessage('Imóvel inativado com sucesso.');
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
      if (axios.isAxiosError(apiError) && apiError.response?.status === 403) {
        setInactivationError('Você não tem permissão para inativar este imóvel.');
      } else {
        setInactivationError(toFriendlyError(apiError, 'Não foi possível inativar o imóvel. Tente novamente.'));
      }
    } finally {
      setIsInactivating(false);
    }
  };

  return (
    <main className="content-page">
      <section className="card imoveis-header-card">
        <div className="row">
          <h1>Consulta de Imóveis</h1>
          <button type="button" className="primary imoveis-create-btn" onClick={() => navigate('/imoveis/cadastrar')}>
            Cadastrar Imóvel
          </button>
        </div>
      </section>

      <ImoveisFiltro initialFilters={filters} onFilter={handleFilter} onClear={handleClear} />

      <section className="card imoveis-list-card">
        {successMessage && <div className="global-success">{successMessage}</div>}

        {isLoading && (
          <div className="imoveis-skeleton-grid" aria-live="polite" aria-label="Carregando imóveis">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="imoveis-skeleton-card">
                <div className="imoveis-skeleton-image" />
                <div className="imoveis-skeleton-line" />
                <div className="imoveis-skeleton-line short" />
                <div className="imoveis-skeleton-line" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && <div className="global-error">{error}</div>}

        {!isLoading && !error && imoveis.length === 0 && <p className="info-text">Nenhum imóvel encontrado</p>}

        {!isLoading && !error && imoveis.length > 0 && (
          <>
            <ImoveisTabela
              imoveis={imoveis}
              formatCurrency={(value) => currencyFormatter.format(value)}
              formatDate={(date) => (date ? dateFormatter.format(new Date(date)) : '-')}
              canInativar={canInativarImovel}
              onVisualizar={handleVisualizarImovel}
              onInativar={openInactivationModal}
            />
            <ImoveisPaginacao
              page={filters.page || DEFAULT_PAGE}
              limit={filters.limit || DEFAULT_LIMIT}
              total={total}
              onChangePage={handleChangePage}
            />
          </>
        )}
      </section>

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
