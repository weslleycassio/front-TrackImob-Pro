import { useEffect, useState } from 'react';
import type { User } from '../../api/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
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
      setValidationError('Selecione o motivo da inativacao.');
      return;
    }

    if (exigeResponsavelFechamento && !responsavelFechamentoId) {
      setValidationError(`Selecione quem ${motivo === 'ALUGADO' ? 'alugou' : 'vendeu'} o imovel.`);
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
    <Modal
      title="Confirmar inativacao"
      subtitle={`Imovel: ${imovel.titulo}`}
      onClose={isSubmitting ? undefined : onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Inativando...' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <p className="saas-copy">Informe o motivo da inativacao para concluir o processo com rastreabilidade.</p>

      {validationError || error ? <div className="global-error">{validationError ?? error}</div> : null}

      <Select
        id="inativar-imovel-motivo"
        label="Motivo"
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
      </Select>

      {exigeResponsavelFechamento ? (
        <Select
          id="inativar-imovel-responsavel-fechamento"
          label={responsavelLabel}
          value={responsavelFechamentoId}
          hint={usuariosFechamentoError ?? undefined}
          onChange={(event) => {
            setResponsavelFechamentoId(event.target.value);
            if (validationError) {
              setValidationError(null);
            }
          }}
          disabled={isSubmitting || isLoadingUsuariosFechamento}
        >
          <option value="">
            {isLoadingUsuariosFechamento ? 'Carregando usuarios...' : `Selecione ${responsavelLabel.toLowerCase()}`}
          </option>
          {usuariosFechamento.map((usuario) => (
            <option key={usuario.id} value={String(usuario.id)}>
              {usuario.nome}
            </option>
          ))}
        </Select>
      ) : null}

      <div className="ui-field">
        <label className="ui-label" htmlFor="inativar-imovel-descricao">
          Descricao
        </label>
        <textarea
          id="inativar-imovel-descricao"
          className="ui-control imoveis-modal-description"
          rows={4}
          placeholder="Adicione um contexto complementar, se necessario."
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  );
}
