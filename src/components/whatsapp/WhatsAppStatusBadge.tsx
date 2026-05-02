import { Badge } from '../ui/Badge';
import { whatsappStatusLabels, type WhatsAppConnectionStatus } from '../../types/whatsapp';

type WhatsAppStatusBadgeProps = {
  status?: WhatsAppConnectionStatus | null;
};

function getStatusVariant(status?: string | null) {
  switch (status) {
    case 'CONNECTED':
      return 'success';
    case 'PENDING':
    case 'QR_READY':
    case 'PAIRING_CODE':
      return 'warning';
    case 'CONNECTING':
      return 'info';
    case 'DISCONNECTED':
    case 'EXPIRED':
    case 'ERROR':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getStatusLabel(status?: string | null) {
  if (!status) {
    return 'Sem status';
  }

  return whatsappStatusLabels[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

export function WhatsAppStatusBadge({ status }: WhatsAppStatusBadgeProps) {
  return <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>;
}
