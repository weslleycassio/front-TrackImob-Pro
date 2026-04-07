import type { InternalImovel } from '../../services/imoveisService';
import { ImoveisCard } from './ImoveisCard';

type ImoveisTabelaProps = {
  imoveis: InternalImovel[];
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
  canEdit: (imovel: InternalImovel) => boolean;
  canActivate: (imovel: InternalImovel) => boolean;
  canInativar: (imovel: InternalImovel) => boolean;
  activatingImovelId?: string | number | null;
  onVisualizar: (imovel: InternalImovel) => void;
  onEditar: (imovel: InternalImovel) => void;
  onAtivar: (imovel: InternalImovel) => void;
  onInativar: (imovel: InternalImovel) => void;
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
