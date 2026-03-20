import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
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

const getStatusVariant = (status?: string) => (String(status).toUpperCase() === 'ATIVO' ? 'success' : 'danger');

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
    <article className="imovel-card saas-card">
      <ImovelCarousel imagens={imovel.imagens ?? []} titulo={imovel.titulo} />

      <div className="imovel-card-content saas-card__body">
        <div className="imovel-card__header">
          <div>
            <h3>{imovel.titulo}</h3>
            <p className="imovel-card-meta">
              {imovel.tipo} • {imovel.finalidade}
            </p>
          </div>
          <Badge variant={getStatusVariant(imovel.status)}>{String(imovel.status).toUpperCase()}</Badge>
        </div>

        <div className="imovel-card__facts">
          <div>
            <span>Local</span>
            <strong>
              {imovel.bairro} - {imovel.cidade}
            </strong>
          </div>
          <div>
            <span>Preco</span>
            <strong>{formatCurrency(imovel.preco)}</strong>
          </div>
          <div>
            <span>Cadastro</span>
            <strong>{formatDate(imovel.createdAt)}</strong>
          </div>
        </div>

        {imovel.descricao ? <p className="imovel-card-description">{imovel.descricao}</p> : null}

        <div className="imoveis-actions">
          <Button variant="secondary" size="sm" onClick={() => onVisualizar(imovel)}>
            Visualizar
          </Button>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => onEditar(imovel)}>
              Editar
            </Button>
          ) : null}
          {canActivate ? (
            <Button variant="secondary" size="sm" onClick={() => onAtivar(imovel)} disabled={isActivating}>
              {isActivating ? 'Ativando...' : 'Ativar'}
            </Button>
          ) : null}
          {canInativar ? (
            <Button variant="danger" size="sm" onClick={() => onInativar(imovel)}>
              Inativar
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
