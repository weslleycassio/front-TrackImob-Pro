import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ImoveisFiltro } from '../../components/imoveis/ImoveisFiltro';
import { ImoveisPaginacao } from '../../components/imoveis/ImoveisPaginacao';
import { ImoveisTabela } from '../../components/imoveis/ImoveisTabela';
import { getImoveis, type GetImoveisFilters, type Imovel } from '../../services/imoveisService';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);

  const filters = useMemo(() => mapSearchParamsToFilters(searchParams), [searchParams]);

  const loadImoveis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getImoveis(filters);
      console.log('[ConsultaImoveisPage] Resposta bruta de imóveis:', response);
      console.log('[ConsultaImoveisPage] Lista de imóveis recebida:', response.data ?? []);
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
    </main>
  );
}
