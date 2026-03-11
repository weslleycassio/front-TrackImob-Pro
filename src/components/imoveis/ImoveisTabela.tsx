import type { Imovel } from '../../services/imoveisService';
import { ImoveisCard } from './ImoveisCard';

type ImoveisTabelaProps = {
  imoveis: Imovel[];
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
  canInativar: (imovel: Imovel) => boolean;
  onVisualizar: (imovel: Imovel) => void;
  onInativar: (imovel: Imovel) => void;
};

export function ImoveisTabela({
  imoveis,
  formatCurrency,
  formatDate,
  canInativar,
  onVisualizar,
  onInativar,
}: ImoveisTabelaProps) {
  return (
    <div className="imoveis-card-list">
      {imoveis.map((imovel) => (
        <ImoveisCard
          key={imovel.id}
          imovel={imovel}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          canInativar={canInativar(imovel)}
          onVisualizar={onVisualizar}
          onInativar={onInativar}
        />
      ))}
    </div>
  );
}
