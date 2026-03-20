import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { GetImoveisFilters } from '../../services/imoveisService';

type ImoveisFiltroProps = {
  initialFilters: GetImoveisFilters;
  onFilter: (filters: GetImoveisFilters) => void;
  onClear: () => void;
};

const tipos = ['Apartamento', 'Casa', 'Sobrado', 'Assobradado', 'Terreno', 'Comercial', 'Planta', 'Outro'];
const FINALIDADE_LOCACAO = 'Loca\u00e7\u00e3o';

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
    <Card
      className="imoveis-filtro-card"
      title="Filtros"
      subtitle="Combine cidade, tipo, preco e status para encontrar imoveis com mais rapidez."
    >
      <form onSubmit={handleSubmit} className="saas-form-grid saas-form-grid--wide">
        <div className="saas-form-span-2">
          <Input
            id="busca"
            label="Busca por texto"
            placeholder="Titulo, bairro ou cidade"
            value={filters.busca ?? ''}
            onChange={(event) => updateField('busca', event.target.value)}
          />
        </div>

        <Input id="cidade" label="Cidade" value={filters.cidade ?? ''} onChange={(event) => updateField('cidade', event.target.value)} />
        <Input id="bairro" label="Bairro" value={filters.bairro ?? ''} onChange={(event) => updateField('bairro', event.target.value)} />

        <Select id="tipo" label="Tipo" value={filters.tipo ?? ''} onChange={(event) => updateField('tipo', event.target.value)}>
          <option value="">Todos</option>
          {tipos.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </Select>

        <Select
          id="finalidade"
          label="Finalidade"
          value={filters.finalidade ?? ''}
          onChange={(event) => updateField('finalidade', event.target.value)}
        >
          <option value="">Todas</option>
          <option value="Venda">Venda</option>
          <option value={FINALIDADE_LOCACAO}>{FINALIDADE_LOCACAO}</option>
        </Select>

        <Select id="status" label="Status" value={filters.status ?? ''} onChange={(event) => updateField('status', event.target.value)}>
          <option value="">Todos</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
        </Select>

        <Input
          id="precoMin"
          label="Preco minimo"
          type="number"
          min={0}
          value={filters.precoMin ?? ''}
          onChange={(event) => updateField('precoMin', event.target.value ? Number(event.target.value) : undefined)}
        />

        <Input
          id="precoMax"
          label="Preco maximo"
          type="number"
          min={0}
          value={filters.precoMax ?? ''}
          onChange={(event) => updateField('precoMax', event.target.value ? Number(event.target.value) : undefined)}
        />

        <div className="saas-form-actions">
          <Button type="submit">Aplicar filtros</Button>
          <Button type="button" variant="secondary" onClick={onClear}>
            Limpar
          </Button>
        </div>
      </form>
    </Card>
  );
}
