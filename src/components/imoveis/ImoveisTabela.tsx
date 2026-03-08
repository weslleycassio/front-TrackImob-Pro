import type { Imovel } from '../../services/imoveis';
import { ImoveisCard } from './ImoveisCard';

type ImoveisTabelaProps = {
  imoveis: Imovel[];
  formatCurrency: (value: number) => string;
  formatDate: (date?: string) => string;
};

export function ImoveisTabela({ imoveis, formatCurrency, formatDate }: ImoveisTabelaProps) {
  return (
    <section>
      <div className="imoveis-table-wrapper">
        <table className="imoveis-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Finalidade</th>
              <th>Bairro</th>
              <th>Cidade</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Data cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {imoveis.map((imovel) => (
              <tr key={imovel.id}>
                <td>{imovel.titulo}</td>
                <td>{imovel.tipo}</td>
                <td>{imovel.finalidade}</td>
                <td>{imovel.bairro}</td>
                <td>{imovel.cidade}</td>
                <td>{formatCurrency(imovel.preco)}</td>
                <td>{imovel.status}</td>
                <td>{formatDate(imovel.createdAt)}</td>
                <td>
                  <div className="imoveis-actions">
                    <button type="button" className="secondary">Visualizar</button>
                    <button type="button" className="secondary">Editar</button>
                    <button type="button" className="secondary danger">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="imoveis-card-list">
        {imoveis.map((imovel) => (
          <ImoveisCard key={imovel.id} imovel={imovel} formatCurrency={formatCurrency} formatDate={formatDate} />
        ))}
      </div>
    </section>
  );
}
