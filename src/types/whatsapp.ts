export type WhatsAppConnectionStatus =
  | 'PENDING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'QR_READY'
  | 'PAIRING_CODE'
  | 'EXPIRED'
  | 'ERROR'
  | (string & {});

export type WhatsAppConnection = {
  instanceName: string;
  status: WhatsAppConnectionStatus;
  connectedNumber: string | null;
  qrCodeBase64: string | null;
  pairingCode: string | null;
  profileName: string | null;
  serverUrl: string | null;
  lastError: string | null;
  updatedAt: string | null;
  isConnected: boolean;
};

export type WhatsAppGroup = {
  id: string;
  name: string;
  description: string | null;
  owner: string | null;
  participantsCount: number | null;
};

export type RealEstateWhatsAppConfig = {
  realEstateId: string | number;
  groupId: string | null;
  groupName: string | null;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SaveRealEstateWhatsAppConfigPayload = {
  groupId: string | null;
  groupName: string | null;
  enabled: boolean;
};

export type WhatsAppMessageLog = {
  id: string | number;
  realEstateId: string | number | null;
  realEstateName: string | null;
  userId: string | number | null;
  userName: string | null;
  groupId: string | null;
  groupName: string | null;
  targetType: 'user' | 'group' | string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | string;
  errorMessage: string | null;
  createdAt: string | null;
  sentAt: string | null;
};

export type CreateWhatsAppConnectionPayload = {
  instanceName?: string;
};

export type SendWhatsAppTextMessagePayload = {
  number: string;
  text: string;
};

export type WhatsAppConversationChannel = 'individual' | 'group';

export type WhatsAppConversationSummary = {
  id: string;
  name: string;
  subtitle: string;
  channel: WhatsAppConversationChannel;
  avatar: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  online?: boolean;
  phoneNumber: string | null;
  jid: string | null;
  assignedTo: string | null;
  leadName: string | null;
  isGroup: boolean;
};

export type WhatsAppConversationMessageDirection = 'in' | 'out' | 'system';

export type WhatsAppConversationMessage = {
  id: string;
  direction: WhatsAppConversationMessageDirection;
  text: string;
  timestamp: string;
  status: string | null;
  authorName: string | null;
};

export type ListWhatsAppConversationsParams = {
  search?: string;
  unreadOnly?: boolean;
  channel?: WhatsAppConversationChannel;
};

export type SendWhatsAppConversationMessagePayload = {
  text: string;
};

export const whatsappStatusLabels: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONNECTING: 'Conectando',
  DISCONNECTED: 'Desconectado',
  PENDING: 'Aguardando leitura',
  QR_READY: 'QR Code disponivel',
  PAIRING_CODE: 'Pairing code disponivel',
  EXPIRED: 'QR expirado',
  ERROR: 'Erro',
};
