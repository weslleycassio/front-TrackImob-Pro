import { useEffect, useState, type FormEvent } from 'react';
import type { GetImoveisFilters } from '../../services/imoveis';

type ImoveisFiltroProps = {
  initialFilters: GetImoveisFilters;
  onFilter: (filters: GetImoveisFilters) => void;
  onClear: () => void;
};

const tipos = ['Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Comercial', 'Outro'];

export function ImoveisFiltro({ initialFilters, onFilter, onClear }: ImoveisFiltroProps) {
  const [filters, setFilters] = useState<GetImoveisFilters>(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const updateField = (field: keyof GetImoveisFilters, value: string | number | undefined) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onFilter(filters);
  };

  return (
    <section className="card imoveis-filtro-card">
      <form onSubmit={handleSubmit}>
        <div className="imoveis-filtro-grid">
          <div className="form-group imoveis-filtro-busca">
            <label htmlFor="busca">Busca por texto</label>
            <input
              id="busca"
              type="text"
              placeholder="Título, bairro ou cidade"
              value={filters.busca ?? ''}
              onChange={(event) => updateField('busca', event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cidade">Cidade</label>
            <input id="cidade" type="text" value={filters.cidade ?? ''} onChange={(event) => updateField('cidade', event.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="bairro">Bairro</label>
            <input id="bairro" type="text" value={filters.bairro ?? ''} onChange={(event) => updateField('bairro', event.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="tipo">Tipo</label>
            <select id="tipo" value={filters.tipo ?? ''} onChange={(event) => updateField('tipo', event.target.value)}>
              <option value="">Todos</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="finalidade">Finalidade</label>
            <select
              id="finalidade"
              value={filters.finalidade ?? ''}
              onChange={(event) => updateField('finalidade', event.target.value)}
            >
              <option value="">Todas</option>
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" value={filters.status ?? ''} onChange={(event) => updateField('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="precoMin">Preço mínimo</label>
            <input
              id="precoMin"
              type="number"
              min={0}
              value={filters.precoMin ?? ''}
              onChange={(event) => updateField('precoMin', event.target.value ? Number(event.target.value) : undefined)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="precoMax">Preço máximo</label>
            <input
              id="precoMax"
              type="number"
              min={0}
              value={filters.precoMax ?? ''}
              onChange={(event) => updateField('precoMax', event.target.value ? Number(event.target.value) : undefined)}
            />
          </div>
        </div>

        <div className="imoveis-filtro-actions">
          <button type="submit" className="primary imoveis-filtro-action-btn">
            Filtrar
          </button>
          <button type="button" className="secondary imoveis-filtro-action-btn" onClick={onClear}>
            Limpar filtros
          </button>
        </div>
      </form>
    </section>
  );
}
