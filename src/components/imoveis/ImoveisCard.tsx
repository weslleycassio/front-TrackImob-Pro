import type { Imovel } from '../../services/imoveisService';
import { ImovelCarousel } from './ImovelCarousel';

type ImoveisCardProps = {
  imovel: Imovel;
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
  canEdit: boolean;
  canActivate: boolean;
  canInativar: boolean;
  isActivating: boolean;
  onVisualizar: (imovel: Imovel) => void;
  onEditar: (imovel: Imovel) => void;
  onAtivar: (imovel: Imovel) => void;
  onInativar: (imovel: Imovel) => void;
};

export function ImoveisCard({
  imovel,
  formatCurrency,
  formatDate,
  canEdit,
  canActivate,
  canInativar,
  isActivating,
  onVisualizar,
  onEditar,
  onAtivar,
  onInativar,
}: ImoveisCardProps) {
  return (
    <article className="imovel-card">
      <ImovelCarousel imagens={imovel.imagens ?? []} titulo={imovel.titulo} />

      <div className="imovel-card-content">
        <h3>{imovel.titulo}</h3>
        <p className="imovel-card-meta">
          {imovel.tipo} - {imovel.finalidade}
        </p>

        <p>
          <strong>Local:</strong> {imovel.bairro} - {imovel.cidade}
        </p>
        <p>
          <strong>Preco:</strong> {formatCurrency(imovel.preco)}
        </p>
        <p>
          <strong>Status:</strong> {imovel.status}
        </p>
        <p>
          <strong>Cadastro:</strong> {formatDate(imovel.createdAt)}
        </p>

        {imovel.descricao && <p className="imovel-card-description">{imovel.descricao}</p>}

        <div className="imoveis-actions">
          <button type="button" className="secondary" onClick={() => onVisualizar(imovel)}>
            Visualizar
          </button>
          {canEdit && (
            <button type="button" className="secondary" onClick={() => onEditar(imovel)}>
              Editar
            </button>
          )}
          {canActivate && (
            <button type="button" className="secondary" onClick={() => onAtivar(imovel)} disabled={isActivating}>
              {isActivating ? 'Ativando...' : 'Ativar'}
            </button>
          )}
          {canInativar && (
            <button type="button" className="secondary danger" onClick={() => onInativar(imovel)}>
              Inativar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
