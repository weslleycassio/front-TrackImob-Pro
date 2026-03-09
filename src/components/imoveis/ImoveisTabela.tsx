import type { Imovel } from '../../services/imoveisService';
import { ImoveisCard } from './ImoveisCard';

type ImoveisTabelaProps = {
  imoveis: Imovel[];
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
};

export function ImoveisTabela({ imoveis, formatCurrency, formatDate }: ImoveisTabelaProps) {
  return (
    <div className="imoveis-card-list">
      {imoveis.map((imovel) => (
        <ImoveisCard key={imovel.id} imovel={imovel} formatCurrency={formatCurrency} formatDate={formatDate} />
      ))}
    </div>
  );
}
