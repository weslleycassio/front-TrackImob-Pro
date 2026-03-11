import { useEffect, useState } from 'react';
import type { User } from '../../api/types';
import {
  motivoInativacaoImovelOptions,
  type Imovel,
  type InativarImovelPayload,
  type MotivoInativacaoImovel,
} from '../../services/imoveisService';

type InativarImovelModalProps = {
  imovel: Imovel | null;
  usuariosFechamento: User[];
  isLoadingUsuariosFechamento: boolean;
  usuariosFechamentoError: string | null;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (payload: InativarImovelPayload) => Promise<void>;
};

const motivosComResponsavelFechamento: MotivoInativacaoImovel[] = ['VENDA_CONCLUIDA', 'ALUGADO'];

export function InativarImovelModal({
  imovel,
  usuariosFechamento,
  isLoadingUsuariosFechamento,
  usuariosFechamentoError,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: InativarImovelModalProps) {
  const [motivo, setMotivo] = useState<MotivoInativacaoImovel | ''>('');
  const [descricao, setDescricao] = useState('');
  const [responsavelFechamentoId, setResponsavelFechamentoId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const exigeResponsavelFechamento =
    motivo !== '' && motivosComResponsavelFechamento.includes(motivo as MotivoInativacaoImovel);
  const responsavelLabel = motivo === 'ALUGADO' ? 'Alugado por' : 'Vendido por';

  useEffect(() => {
    if (!imovel) {
      return;
    }

    setMotivo('');
    setDescricao('');
    setResponsavelFechamentoId('');
    setValidationError(null);
  }, [imovel]);

  useEffect(() => {
    if (!exigeResponsavelFechamento) {
      setResponsavelFechamentoId('');
    }
  }, [exigeResponsavelFechamento]);

  if (!imovel) {
    return null;
  }

  const handleConfirm = async () => {
    if (!motivo) {
      setValidationError('Selecione o motivo da inativação.');
      return;
    }

    if (exigeResponsavelFechamento && !responsavelFechamentoId) {
      setValidationError(`Selecione quem ${motivo === 'ALUGADO' ? 'alugou' : 'vendeu'} o imóvel.`);
      return;
    }

    setValidationError(null);

    await onConfirm({
      motivo,
      descricao: descricao.trim() || undefined,
      responsavelFechamentoId: exigeResponsavelFechamento ? responsavelFechamentoId : undefined,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="inativar-imovel-title">
        <h2 id="inativar-imovel-title">Inativar imóvel</h2>
        <p className="info-text">
          Tem certeza que deseja inativar este imóvel? Informe o motivo da inativação para concluir o processo.
        </p>
        <p>
          <strong>Imóvel:</strong> {imovel.titulo}
        </p>

        {(validationError || error) && <div className="global-error">{validationError ?? error}</div>}

        <div className="form-group">
          <label htmlFor="inativar-imovel-motivo">Motivo</label>
          <select
            id="inativar-imovel-motivo"
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value as MotivoInativacaoImovel | '');
              if (validationError) {
                setValidationError(null);
              }
            }}
            disabled={isSubmitting}
          >
            <option value="">Selecione um motivo</option>
            {motivoInativacaoImovelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {exigeResponsavelFechamento && (
          <div className="form-group">
            <label htmlFor="inativar-imovel-responsavel-fechamento">{responsavelLabel}</label>
            <select
              id="inativar-imovel-responsavel-fechamento"
              value={responsavelFechamentoId}
              onChange={(event) => {
                setResponsavelFechamentoId(event.target.value);
                if (validationError) {
                  setValidationError(null);
                }
              }}
              disabled={isSubmitting || isLoadingUsuariosFechamento}
            >
              <option value="">
                {isLoadingUsuariosFechamento ? 'Carregando usuários...' : `Selecione ${responsavelLabel.toLowerCase()}`}
              </option>
              {usuariosFechamento.map((usuario) => (
                <option key={usuario.id} value={String(usuario.id)}>
                  {usuario.nome}
                </option>
              ))}
            </select>
            {usuariosFechamentoError && <span className="error-text">{usuariosFechamentoError}</span>}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="inativar-imovel-descricao">Descrição</label>
          <textarea
            id="inativar-imovel-descricao"
            className="imoveis-modal-description"
            rows={4}
            placeholder="Adicione um contexto complementar, se necessário."
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="imoveis-modal-actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary modal-save-button"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Inativando...' : 'Confirmar inativação'}
          </button>
        </div>
      </div>
    </div>
  );
}
