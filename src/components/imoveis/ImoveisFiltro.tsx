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
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const normalizeTextFilter = (value?: string) => value?.trim().replace(/\s+/g, ' ') ?? '';
const formatPriceValue = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? currencyFormatter.format(value) : '');
const toDigitsOnly = (value: string) => value.replace(/\D/g, '');

export function ImoveisFiltro({ initialFilters, onFilter, onClear }: ImoveisFiltroProps) {
  const [filters, setFilters] = useState<GetImoveisFilters>(initialFilters);
  const [precoMinInput, setPrecoMinInput] = useState(() => formatPriceValue(initialFilters.precoMin));
  const [precoMaxInput, setPrecoMaxInput] = useState(() => formatPriceValue(initialFilters.precoMax));

  useEffect(() => {
    setFilters(initialFilters);
    setPrecoMinInput(formatPriceValue(initialFilters.precoMin));
    setPrecoMaxInput(formatPriceValue(initialFilters.precoMax));
  }, [initialFilters]);

  const updateField = (field: keyof GetImoveisFilters, value: string | number | undefined) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updatePriceField = (
    field: 'precoMin' | 'precoMax',
    value: string,
    setInput: (nextValue: string) => void,
  ) => {
    const digits = toDigitsOnly(value);
    setInput(digits);
    updateField(field, digits ? Number(digits) : undefined);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedFilters = {
      ...filters,
      busca: normalizeTextFilter(filters.busca),
    };

    setFilters(normalizedFilters);
    onFilter(normalizedFilters);
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
            placeholder="Titulo, bairro, cidade ou descricao"
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
          type="text"
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={precoMinInput}
          onFocus={() => setPrecoMinInput(filters.precoMin !== undefined ? String(Math.trunc(filters.precoMin)) : '')}
          onBlur={() => setPrecoMinInput(formatPriceValue(filters.precoMin))}
          onChange={(event) => updatePriceField('precoMin', event.target.value, setPrecoMinInput)}
        />

        <Input
          id="precoMax"
          label="Preco maximo"
          type="text"
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={precoMaxInput}
          onFocus={() => setPrecoMaxInput(filters.precoMax !== undefined ? String(Math.trunc(filters.precoMax)) : '')}
          onBlur={() => setPrecoMaxInput(formatPriceValue(filters.precoMax))}
          onChange={(event) => updatePriceField('precoMax', event.target.value, setPrecoMaxInput)}
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
