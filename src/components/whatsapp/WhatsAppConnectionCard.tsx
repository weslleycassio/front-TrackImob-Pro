import { Link } from 'react-router-dom';
import { MessageCircle, Power, RefreshCw, Smartphone } from 'lucide-react';
import type { WhatsAppConnection } from '../../types/whatsapp';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { WhatsAppStatusBadge } from './WhatsAppStatusBadge';

type WhatsAppConnectionCardProps = {
  companyName?: string | null;
  connection: WhatsAppConnection | null;
  instanceNameDraft: string;
  error: string | null;
  isStatusLoading: boolean;
  isConnecting: boolean;
  isRefreshingQr: boolean;
  isDisconnecting: boolean;
  onInstanceNameChange: (value: string) => void;
  onConnect: () => void;
  onRefreshStatus: () => void;
  onRefreshQr: () => void;
  onDisconnect: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Agora mesmo';
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return 'Agora mesmo';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsedValue);
}

export function WhatsAppConnectionCard({
  companyName,
  connection,
  instanceNameDraft,
  error,
  isStatusLoading,
  isConnecting,
  isRefreshingQr,
  isDisconnecting,
  onInstanceNameChange,
  onConnect,
  onRefreshStatus,
  onRefreshQr,
  onDisconnect,
}: WhatsAppConnectionCardProps) {
  const hasActiveInstance = Boolean(connection?.instanceName || instanceNameDraft.trim());
  const canRefreshQr = Boolean(connection?.instanceName) && !connection?.isConnected;

  return (
    <Card
      className="whatsapp-card whatsapp-card--status"
      title="Conexao do WhatsApp"
      subtitle="Gerencie a instancia principal da imobiliaria, acompanhe o status da Evolution API e libere o uso do canal no CRM."
      actions={
        <Button
          variant="secondary"
          icon={<RefreshCw size={16} aria-hidden="true" />}
          onClick={onRefreshStatus}
          disabled={isStatusLoading}
        >
          {isStatusLoading ? 'Atualizando...' : 'Atualizar status'}
        </Button>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="whatsapp-status-hero">
        <div className="whatsapp-status-hero__icon" aria-hidden="true">
          <Smartphone size={22} />
        </div>
        <div className="whatsapp-status-hero__copy">
          <div className="whatsapp-status-hero__badges">
            <WhatsAppStatusBadge status={connection?.status} />
            {connection?.connectedNumber ? <span className="whatsapp-status-hero__number">{connection.connectedNumber}</span> : null}
          </div>
          <h3>{connection?.profileName || connection?.instanceName || companyName || 'Instancia principal do WhatsApp'}</h3>
          <p>
            {connection?.isConnected
              ? 'A conexao esta ativa e pronta para envio de mensagens, acesso aos grupos e evolucao do chat comercial.'
              : 'Crie ou reconecte a instancia para gerar um novo QR Code e continuar o atendimento.'}
          </p>
        </div>
      </div>

      <div className="whatsapp-summary-grid">
        <div className="whatsapp-summary-item">
          <span>Instancia</span>
          <strong>{connection?.instanceName || instanceNameDraft.trim() || 'A definir'}</strong>
        </div>
        <div className="whatsapp-summary-item">
          <span>Numero conectado</span>
          <strong>{connection?.connectedNumber || 'Nao conectado'}</strong>
        </div>
        <div className="whatsapp-summary-item">
          <span>Ultima atualizacao</span>
          <strong>{formatDateTime(connection?.updatedAt)}</strong>
        </div>
      </div>

      <div className="whatsapp-actions-grid">
        <Input
          id="whatsapp-instance-name"
          label="Nome da instancia"
          value={instanceNameDraft}
          placeholder="trackimob-principal"
          hint="Use um nome estavel para a instancia. Se o backend gerar automaticamente, este campo pode ficar em branco."
          onChange={(event) => onInstanceNameChange(event.target.value)}
        />

        <div className="whatsapp-actions-grid__buttons">
          <Button icon={<Smartphone size={16} aria-hidden="true" />} onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? 'Conectando...' : 'Conectar WhatsApp'}
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={onRefreshQr}
            disabled={!canRefreshQr || isRefreshingQr}
          >
            {isRefreshingQr ? 'Gerando QR...' : 'Gerar novo QR'}
          </Button>
          <Button
            variant="danger"
            icon={<Power size={16} aria-hidden="true" />}
            onClick={onDisconnect}
            disabled={!hasActiveInstance || isDisconnecting}
          >
            {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
          </Button>
        </div>
      </div>

      <div className="whatsapp-card__footer">
        <span className="ui-field__hint">
          {connection?.serverUrl
            ? `Servidor conectado: ${connection.serverUrl}`
            : 'Assim que a instancia estiver ativa, esta tela passa a centralizar QR Code, pairing code e monitoramento.'}
        </span>

        <Link to="/crm/conversas" className="whatsapp-card__footer-link">
          <MessageCircle size={16} aria-hidden="true" />
          Abrir conversas
        </Link>
      </div>
    </Card>
  );
}
