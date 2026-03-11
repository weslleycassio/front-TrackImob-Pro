import type { Imovel } from '../../services/imoveisService';
import { ImovelCarousel } from './ImovelCarousel';

type ImoveisCardProps = {
  imovel: Imovel;
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
  canInativar: boolean;
  onVisualizar: (imovel: Imovel) => void;
  onInativar: (imovel: Imovel) => void;
};

export function ImoveisCard({
  imovel,
  formatCurrency,
  formatDate,
  canInativar,
  onVisualizar,
  onInativar,
}: ImoveisCardProps) {
  const isInativo = String(imovel.status).toUpperCase() === 'INATIVO';

  return (
    <article className="imovel-card">
      <ImovelCarousel imagens={imovel.imagens ?? []} titulo={imovel.titulo} />

      <div className="imovel-card-content">
        <h3>{imovel.titulo}</h3>
        <p className="imovel-card-meta">
          {imovel.tipo} • {imovel.finalidade}
        </p>

        <p>
          <strong>Local:</strong> {imovel.bairro} - {imovel.cidade}
        </p>
        <p>
          <strong>Preço:</strong> {formatCurrency(imovel.preco)}
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
          <button type="button" className="secondary" disabled title="Edição ainda não disponível">
            Editar
          </button>
          {canInativar && (
            <button
              type="button"
              className="secondary danger"
              onClick={() => onInativar(imovel)}
              disabled={isInativo}
              title={isInativo ? 'Imóvel já está inativo' : undefined}
            >
              Inativar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
