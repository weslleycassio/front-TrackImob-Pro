import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type StageDeleteModalProps = {
  stageName: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function StageDeleteModal({ stageName, isSubmitting, error, onClose, onConfirm }: StageDeleteModalProps) {
  return (
    <Modal
      title="Excluir coluna?"
      subtitle={`A coluna ${stageName} sera removida do pipeline.`}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Excluindo...' : 'Excluir coluna'}
          </Button>
        </>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}
      <p className="ui-field__hint">
        Todos os leads desta coluna serao movidos automaticamente para a coluna anterior. Esta acao nao podera ser
        desfeita.
      </p>
    </Modal>
  );
}
