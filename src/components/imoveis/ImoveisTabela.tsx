import type { Imovel } from '../../services/imoveisService';
import { ImoveisCard } from './ImoveisCard';

type ImoveisTabelaProps = {
  imoveis: Imovel[];
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
  canEdit: (imovel: Imovel) => boolean;
  canActivate: (imovel: Imovel) => boolean;
  canInativar: (imovel: Imovel) => boolean;
  activatingImovelId?: string | number | null;
  onVisualizar: (imovel: Imovel) => void;
  onEditar: (imovel: Imovel) => void;
  onAtivar: (imovel: Imovel) => void;
  onInativar: (imovel: Imovel) => void;
};

export function ImoveisTabela({
  imoveis,
  formatCurrency,
  formatDate,
  canEdit,
  canActivate,
  canInativar,
  activatingImovelId,
  onVisualizar,
  onEditar,
  onAtivar,
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
          canEdit={canEdit(imovel)}
          canActivate={canActivate(imovel)}
          canInativar={canInativar(imovel)}
          isActivating={activatingImovelId !== null && activatingImovelId !== undefined && String(activatingImovelId) === String(imovel.id)}
          onVisualizar={onVisualizar}
          onEditar={onEditar}
          onAtivar={onAtivar}
          onInativar={onInativar}
        />
      ))}
    </div>
  );
}
