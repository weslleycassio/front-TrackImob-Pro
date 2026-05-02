import { RefreshCw } from 'lucide-react';
import type { WhatsAppConnection } from '../../types/whatsapp';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

type WhatsAppQRCodeCardProps = {
  connection: WhatsAppConnection | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function WhatsAppQRCodeCard({ connection, isLoading, error, onRefresh }: WhatsAppQRCodeCardProps) {
  const isConnected = connection?.isConnected;
  const hasQrCode = Boolean(connection?.qrCodeBase64);
  const hasPairingCode = Boolean(connection?.pairingCode);
  const shouldShowExpiredState = !isLoading && !error && !isConnected && !hasQrCode && Boolean(connection?.instanceName);

  return (
    <Card
      className="whatsapp-card"
      title="QR Code e pairing code"
      subtitle="Use o QR Code para autenticar o WhatsApp no aparelho e acompanhe o pairing code quando o backend o disponibilizar."
      actions={
        <Button
          variant="secondary"
          icon={<RefreshCw size={16} aria-hidden="true" />}
          onClick={onRefresh}
          disabled={!connection?.instanceName || isLoading}
        >
          {isLoading ? 'Atualizando...' : 'Atualizar QR'}
        </Button>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="whatsapp-qr-shell">
        <div className="whatsapp-qr-shell__visual">
          {isLoading ? (
            <div className="whatsapp-qr-shell__loading" aria-hidden="true">
              <Skeleton height={280} className="whatsapp-qr-shell__skeleton" />
            </div>
          ) : null}

          {!isLoading && isConnected ? (
            <EmptyState
              title="WhatsApp ja conectado"
              description="Quando a instancia estiver autenticada, o QR Code deixa de ser necessario e o canal continua pronto para operacao."
            />
          ) : null}

          {!isLoading && !isConnected && hasQrCode ? (
            <div className="whatsapp-qr-frame">
              <img src={connection?.qrCodeBase64 ?? undefined} alt="QR Code do WhatsApp" className="whatsapp-qr-frame__image" />
            </div>
          ) : null}

          {shouldShowExpiredState ? (
            <EmptyState
              title="QR Code expirado ou indisponivel"
              description="Gere um novo QR para continuar a autenticacao da instancia no aplicativo do WhatsApp."
              action={
                <Button variant="secondary" onClick={onRefresh}>
                  Gerar novo QR
                </Button>
              }
            />
          ) : null}

          {!isLoading && !connection?.instanceName ? (
            <EmptyState
              title="Nenhuma instancia selecionada"
              description="Crie ou informe o nome da instancia para carregar o QR Code e iniciar a autenticacao."
            />
          ) : null}
        </div>

        <div className="whatsapp-qr-shell__aside">
          <div className="whatsapp-pairing-panel">
            <span>Pairing code</span>
            <strong>{hasPairingCode ? connection?.pairingCode : 'Aguardando disponibilizacao'}</strong>
            <p>
              {hasPairingCode
                ? 'Use o codigo no fluxo alternativo de autenticacao quando o aparelho solicitar.'
                : 'Se o backend retornar um pairing code, ele aparecera aqui automaticamente.'}
            </p>
          </div>

          <div className="whatsapp-pairing-panel">
            <span>Status visual</span>
            <strong>{isConnected ? 'Autenticado' : hasQrCode ? 'QR pronto para leitura' : 'Aguardando nova autenticacao'}</strong>
            <p>
              O QR Code pode expirar apos alguns segundos. Se isso acontecer, use o botao de atualizar para buscar outro.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
