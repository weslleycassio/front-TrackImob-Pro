import type { Imovel } from '../../services/imoveis';

type ImoveisCardProps = {
  imovel: Imovel;
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
};

export function ImoveisCard({ imovel, formatCurrency, formatDate }: ImoveisCardProps) {
  return (
    <article className="imovel-card">
      <h3>{imovel.titulo}</h3>
      <p>
        <strong>Tipo:</strong> {imovel.tipo}
      </p>
      <p>
        <strong>Finalidade:</strong> {imovel.finalidade}
      </p>
      <p>
        <strong>Bairro:</strong> {imovel.bairro}
      </p>
      <p>
        <strong>Cidade:</strong> {imovel.cidade}
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
      <div className="imoveis-actions">
        <button type="button" className="secondary">Visualizar</button>
        <button type="button" className="secondary">Editar</button>
        <button type="button" className="secondary danger">Excluir</button>
      </div>
    </article>
  );
}
