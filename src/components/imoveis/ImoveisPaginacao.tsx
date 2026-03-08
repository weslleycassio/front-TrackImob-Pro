type ImoveisPaginacaoProps = {
  page: number;
  limit: number;
  total?: number;
  onChangePage: (page: number) => void;
};

export function ImoveisPaginacao({ page, limit, total, onChangePage }: ImoveisPaginacaoProps) {
  const hasTotal = typeof total === 'number' && total >= 0;
  const totalPages = hasTotal ? Math.max(1, Math.ceil(total / limit)) : page + 1;

  const canGoPrevious = page > 1;
  const canGoNext = hasTotal ? page < totalPages : true;

  return (
    <div className="imoveis-pagination">
      <div>
        {hasTotal ? (
          <span>
            Total de registros: <strong>{total}</strong>
          </span>
        ) : (
          <span>Total de registros indisponível no momento.</span>
        )}
      </div>

      <div className="imoveis-pagination-actions">
        <button type="button" className="secondary" onClick={() => onChangePage(page - 1)} disabled={!canGoPrevious}>
          Anterior
        </button>
        <span>
          Página <strong>{page}</strong>
          {hasTotal ? ` de ${totalPages}` : ''}
        </span>
        <button type="button" className="secondary" onClick={() => onChangePage(page + 1)} disabled={!canGoNext}>
          Próxima
        </button>
      </div>
    </div>
  );
}
