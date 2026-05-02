import { Send } from 'lucide-react';
import type { WhatsAppConnection } from '../../types/whatsapp';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

type WhatsAppTestMessageCardProps = {
  connection: WhatsAppConnection | null;
  destination: string;
  message: string;
  isSubmitting: boolean;
  error: string | null;
  onDestinationChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
};

export function WhatsAppTestMessageCard({
  connection,
  destination,
  message,
  isSubmitting,
  error,
  onDestinationChange,
  onMessageChange,
  onSubmit,
}: WhatsAppTestMessageCardProps) {
  const isDisabled = !connection?.instanceName || !connection.isConnected;

  return (
    <Card
      className="whatsapp-card"
      title="Mensagem teste"
      subtitle="Valide rapidamente a integracao enviando uma mensagem para um numero individual ou para o JID de um grupo."
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="modal-form-grid">
        <Input
          id="whatsapp-message-destination"
          label="Numero ou JID"
          value={destination}
          placeholder="5511999999999 ou 1203630@g.us"
          hint="Aceita numero com DDI ou identificador de grupo retornado pela listagem."
          onChange={(event) => onDestinationChange(event.target.value)}
          disabled={isDisabled}
        />

        <div className="ui-field">
          <label className="ui-label" htmlFor="whatsapp-message-body">
            Mensagem
          </label>
          <textarea
            id="whatsapp-message-body"
            value={message}
            placeholder="Digite uma mensagem curta para validar o canal."
            onChange={(event) => onMessageChange(event.target.value)}
            disabled={isDisabled}
          />
          <span className="ui-field__hint">
            {isDisabled
              ? 'Conecte a instancia primeiro para liberar o envio.'
              : 'Use mensagens curtas para validar o fluxo antes de acionar automacoes ou campanhas.'}
          </span>
        </div>
      </div>

      <div className="whatsapp-inline-actions">
        <Button icon={<Send size={16} aria-hidden="true" />} onClick={onSubmit} disabled={isDisabled || isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar mensagem teste'}
        </Button>
        <span className="ui-field__hint">
          {connection?.instanceName
            ? `Instancia ativa: ${connection.instanceName}`
            : 'Nenhuma instancia ativa para envio no momento.'}
        </span>
      </div>
    </Card>
  );
}
