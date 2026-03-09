import type { Imovel } from '../../services/imoveisService';
import { ImovelCarousel } from './ImovelCarousel';

type ImoveisCardProps = {
  imovel: Imovel;
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
};

export function ImoveisCard({ imovel, formatCurrency, formatDate }: ImoveisCardProps) {
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
          <button type="button" className="secondary">Visualizar</button>
          <button type="button" className="secondary">Editar</button>
          <button type="button" className="secondary danger">Excluir</button>
        </div>
      </div>
    </article>
  );
}
