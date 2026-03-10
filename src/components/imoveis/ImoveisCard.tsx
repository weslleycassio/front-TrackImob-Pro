import { useMemo } from 'react';
import type { Imovel } from '../../services/imoveisService';
import { ImovelCarousel } from './ImovelCarousel';
import { getImovelImagemPrincipal } from '../../utils/imovelImages';

type ImoveisCardProps = {
  imovel: Imovel;
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
};

export function ImoveisCard({ imovel, formatCurrency, formatDate }: ImoveisCardProps) {
  const imagemPrincipal = useMemo(() => getImovelImagemPrincipal(imovel.imagens), [imovel.imagens]);

  console.log('[ImoveisCard] Imóvel:', imovel);
  console.log('[ImoveisCard] Campo imagens:', imovel.imagens);
  console.log('[ImoveisCard] Imagem principal resolvida:', imagemPrincipal);

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
