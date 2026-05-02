import axios from 'axios';
import { apiClient } from '../api/client';
import { whatsappEndpoints } from '../api/endpoints/whatsapp';
import type {
  CreateWhatsAppConnectionPayload,
  ListWhatsAppConversationsParams,
  SendWhatsAppConversationMessagePayload,
  SendWhatsAppTextMessagePayload,
  WhatsAppConnection,
  WhatsAppConversationMessage,
  WhatsAppConversationSummary,
  WhatsAppGroup,
} from '../types/whatsapp';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toNullableString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function toOptionalDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function toBooleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeStatus(value: unknown) {
  const normalizedValue = toStringValue(value, 'PENDING').trim().toUpperCase();
  return normalizedValue.length > 0 ? normalizedValue : 'PENDING';
}

function normalizePhoneNumber(value: unknown) {
  const rawValue = toNullableString(value);

  if (!rawValue) {
    return null;
  }

  if (rawValue.includes('@')) {
    return rawValue.split('@')[0] ?? rawValue;
  }

  return rawValue;
}

function normalizeImageSource(value: unknown) {
  const rawValue = toNullableString(value);

  if (!rawValue) {
    return null;
  }

  if (rawValue.startsWith('data:image') || rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
    return rawValue;
  }

  const compactValue = rawValue.replace(/\s+/g, '');
  const looksLikeBase64 = compactValue.length > 120 && /^[A-Za-z0-9+/=]+$/.test(compactValue);

  return looksLikeBase64 ? `data:image/png;base64,${compactValue}` : null;
}

function extractListPayload(payload: unknown, collectionKeys: string[]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of collectionKeys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractItemPayload(payload: unknown, itemKeys: string[]) {
  if (!isRecord(payload)) {
    return null;
  }

  for (const key of itemKeys) {
    const candidate = payload[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  return payload;
}

function normalizeConnection(raw: unknown, fallbackInstanceName?: string): WhatsAppConnection {
  const connection = isRecord(raw) ? raw : {};
  const status = normalizeStatus(
    connection.status ??
      connection.state ??
      connection.connectionStatus ??
      connection.instanceStatus ??
      connection.currentStatus,
  );
  const qrCodeBase64 =
    normalizeImageSource(
      connection.qrCodeBase64 ??
        connection.qrCode ??
        connection.qrcode ??
        connection.base64 ??
        connection.qr ??
        connection.image,
    ) ??
    (isRecord(connection.connectData)
      ? normalizeImageSource(
          connection.connectData.qrCodeBase64 ??
            connection.connectData.qrCode ??
            connection.connectData.qrcode ??
            connection.connectData.base64 ??
            connection.connectData.qr,
        )
      : null);

  return {
    instanceName:
      toStringValue(
        connection.instanceName ??
          connection.instance ??
          connection.sessionName ??
          connection.name ??
          connection.instance_id,
      ) || fallbackInstanceName || '',
    status,
    connectedNumber: normalizePhoneNumber(
      connection.connectedNumber ??
        connection.number ??
        connection.phoneNumber ??
        connection.ownerJid ??
        connection.owner ??
        connection.me ??
        (isRecord(connection.account) ? connection.account.number ?? connection.account.jid : null),
    ),
    qrCodeBase64,
    pairingCode:
      toNullableString(
        connection.pairingCode ??
          connection.pairing_code ??
          connection.pairCode ??
          connection.pairing ??
          (qrCodeBase64 ? null : connection.code),
      ) ??
      (isRecord(connection.connectData)
        ? toNullableString(
            connection.connectData.pairingCode ??
              connection.connectData.pairing_code ??
              connection.connectData.pairCode ??
              connection.connectData.pairing ??
              (qrCodeBase64 ? null : connection.connectData.code),
          )
        : null),
    profileName:
      toNullableString(connection.profileName ?? connection.profile_name ?? connection.pushName ?? connection.displayName) ??
      (isRecord(connection.account) ? toNullableString(connection.account.name ?? connection.account.pushName) : null),
    serverUrl: toNullableString(connection.serverUrl ?? connection.server_url ?? connection.baseUrl),
    lastError:
      toNullableString(connection.lastError ?? connection.error ?? connection.errorMessage ?? connection.message) ??
      (isRecord(connection.connectData)
        ? toNullableString(connection.connectData.lastError ?? connection.connectData.error ?? connection.connectData.message)
        : null),
    updatedAt: toOptionalDate(connection.updatedAt ?? connection.updated_at ?? connection.lastUpdate ?? connection.createdAt),
    isConnected:
      status === 'CONNECTED' ||
      toBooleanValue(connection.connected) ||
      toBooleanValue(connection.isConnected) ||
      toBooleanValue(connection.open),
  };
}

function normalizeGroup(raw: unknown): WhatsAppGroup | null {
  const group = isRecord(raw) ? raw : {};
  const id = toStringValue(group.id ?? group.jid ?? group.groupId ?? group.groupJid).trim();

  if (!id) {
    return null;
  }

  const participantsCount =
    toOptionalNumber(group.participantsCount ?? group.size ?? group.membersCount) ??
    (Array.isArray(group.participants) ? group.participants.length : null);

  return {
    id,
    name: toStringValue(group.name ?? group.subject ?? group.groupName ?? group.displayName, id),
    description: toNullableString(group.description ?? group.desc),
    owner: normalizePhoneNumber(group.owner ?? group.ownerJid ?? group.ownerNumber),
    participantsCount,
  };
}

function toDateFromTimestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalizedValue = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(normalizedValue).toISOString();
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      const normalizedValue = numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000;
      return new Date(normalizedValue).toISOString();
    }

    const parsedValue = new Date(value);
    if (!Number.isNaN(parsedValue.getTime())) {
      return parsedValue.toISOString();
    }
  }

  return new Date().toISOString();
}

function getInitials(name: string, fallback = 'WA') {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return fallback;
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function normalizeConversationChannel(raw: unknown, id: string, isGroupValue: boolean) {
  const rawChannel = toStringValue(raw).trim().toLowerCase();

  if (rawChannel === 'group' || rawChannel === 'grupo' || rawChannel === 'whatsapp grupo') {
    return 'group' as const;
  }

  if (rawChannel === 'individual' || rawChannel === 'contato' || rawChannel === 'whatsapp individual') {
    return 'individual' as const;
  }

  if (isGroupValue || id.endsWith('@g.us')) {
    return 'group' as const;
  }

  return 'individual' as const;
}

function extractTextValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (isRecord(value)) {
    return (
      toNullableString(value.text ?? value.body ?? value.message ?? value.content ?? value.caption ?? value.description) ??
      ''
    );
  }

  return '';
}

function normalizeConversation(raw: unknown): WhatsAppConversationSummary | null {
  const conversation = isRecord(raw) ? raw : {};
  const id = toStringValue(
    conversation.id ??
      conversation.conversationId ??
      conversation.chatId ??
      conversation.chat_id ??
      conversation.jid ??
      conversation.remoteJid,
  ).trim();

  if (!id) {
    return null;
  }

  const isGroupValue =
    toBooleanValue(conversation.isGroup) ||
    toBooleanValue(conversation.group) ||
    toBooleanValue(conversation.is_group) ||
    id.endsWith('@g.us');
  const channel = normalizeConversationChannel(conversation.channel ?? conversation.type ?? conversation.kind, id, isGroupValue);
  const jid = toNullableString(conversation.jid ?? conversation.remoteJid ?? conversation.chatJid ?? id) ?? id;
  const phoneNumber = normalizePhoneNumber(
    conversation.phoneNumber ??
      conversation.phone ??
      conversation.number ??
      conversation.remoteJid ??
      conversation.jid,
  );
  const leadName = toNullableString(
    conversation.leadName ?? conversation.crmLeadName ?? (isRecord(conversation.lead) ? conversation.lead.name : null),
  );
  const name =
    toNullableString(
      conversation.name ??
        conversation.contactName ??
        conversation.displayName ??
        conversation.groupName ??
        conversation.subject ??
        (isRecord(conversation.contact) ? conversation.contact.name ?? conversation.contact.pushName : null),
    ) ??
    leadName ??
    phoneNumber ??
    (channel === 'group' ? 'Grupo do WhatsApp' : 'Contato do WhatsApp');
  const subtitle =
    toNullableString(
      conversation.subtitle ??
        conversation.phone ??
        conversation.number ??
        conversation.contactSubtitle ??
        conversation.leadStage ??
        conversation.origin,
    ) ??
    (channel === 'group' ? 'Grupo sincronizado' : phoneNumber ?? 'Contato sincronizado');
  const lastMessage =
    extractTextValue(
      conversation.lastMessage ??
        conversation.lastMessageText ??
        conversation.lastText ??
        conversation.messagePreview ??
        (isRecord(conversation.preview) ? conversation.preview.text ?? conversation.preview.body : null),
    ) || 'Conversa pronta para integrar historico real.';

  return {
    id,
    name,
    subtitle,
    channel,
    avatar: getInitials(name, channel === 'group' ? 'GR' : 'WA'),
    unreadCount: toOptionalNumber(conversation.unreadCount ?? conversation.unread ?? conversation.pendingCount) ?? 0,
    lastMessage,
    lastMessageAt: toDateFromTimestamp(
      conversation.lastMessageAt ??
        conversation.lastActivityAt ??
        conversation.updatedAt ??
        conversation.lastTimestamp ??
        (isRecord(conversation.lastMessage)
          ? conversation.lastMessage.timestamp ?? conversation.lastMessage.createdAt
          : null),
    ),
    online: toBooleanValue(conversation.online ?? conversation.isOnline),
    phoneNumber,
    jid,
    assignedTo: toNullableString(
      conversation.assignedTo ??
        conversation.assignedUserName ??
        (isRecord(conversation.assignee) ? conversation.assignee.name : null),
    ),
    leadName,
    isGroup: channel === 'group',
  };
}

function normalizeMessageDirection(raw: unknown, fallbackText: string) {
  const normalizedValue = toStringValue(raw).trim().toLowerCase();

  if (normalizedValue === 'in' || normalizedValue === 'incoming' || normalizedValue === 'received') {
    return 'in' as const;
  }

  if (normalizedValue === 'out' || normalizedValue === 'outgoing' || normalizedValue === 'sent') {
    return 'out' as const;
  }

  if (normalizedValue === 'system') {
    return 'system' as const;
  }

  if (!fallbackText) {
    return 'system' as const;
  }

  return 'in' as const;
}

function normalizeConversationMessage(raw: unknown): WhatsAppConversationMessage | null {
  const message = isRecord(raw) ? raw : {};
  const text =
    extractTextValue(
      message.text ??
        message.body ??
        message.message ??
        message.content ??
        message.caption ??
        (isRecord(message.payload) ? message.payload.text ?? message.payload.body : null),
    ) || toStringValue(message.event ?? message.type ?? message.status ?? 'Atualizacao do sistema');
  const directionFromFlag = typeof message.fromMe === 'boolean' ? (message.fromMe ? 'out' : 'in') : null;
  const id =
    toStringValue(message.id ?? message.messageId ?? message.key ?? message.message_id).trim() ||
    `message-${toDateFromTimestamp(message.timestamp ?? message.createdAt)}-${text.slice(0, 12)}`;

  return {
    id,
    direction:
      directionFromFlag ??
      normalizeMessageDirection(message.direction ?? message.kind ?? message.type ?? message.status, text),
    text,
    timestamp: toDateFromTimestamp(message.timestamp ?? message.createdAt ?? message.dateTime ?? message.messageTimestamp),
    status: toNullableString(message.status ?? message.deliveryStatus ?? message.ack),
    authorName: toNullableString(message.authorName ?? message.senderName ?? message.pushName ?? message.author),
  };
}

function pickPreferredConnection(connections: WhatsAppConnection[], preferredInstanceName?: string) {
  if (connections.length === 0) {
    return null;
  }

  const normalizedPreferredInstanceName = preferredInstanceName?.trim();

  if (normalizedPreferredInstanceName) {
    const exactMatch = connections.find((connection) => connection.instanceName === normalizedPreferredInstanceName);
    if (exactMatch) {
      return exactMatch;
    }
  }

  return connections.find((connection) => connection.isConnected) ?? connections[0];
}

export function isWhatsAppMissingEndpointError(error: unknown) {
  return axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405);
}

export async function getWhatsAppConnectionStatus(preferredInstanceName?: string) {
  const { data } = await apiClient.get(whatsappEndpoints.status);
  const connectionItems = extractListPayload(data, ['data', 'connections', 'instances', 'status'])
    .map((item) => normalizeConnection(item))
    .filter((item) => item.instanceName || item.status !== 'PENDING');

  if (connectionItems.length > 0) {
    return pickPreferredConnection(connectionItems, preferredInstanceName);
  }

  const item = extractItemPayload(data, ['data', 'connection', 'instance', 'status']);
  return item ? normalizeConnection(item, preferredInstanceName) : null;
}

export async function createWhatsAppConnection(payload: CreateWhatsAppConnectionPayload = {}) {
  const body = payload.instanceName?.trim() ? { instanceName: payload.instanceName.trim() } : {};
  const { data } = await apiClient.post(whatsappEndpoints.connections, body);
  const item = extractItemPayload(data, ['data', 'connection', 'instance']);
  return normalizeConnection(item ?? body, payload.instanceName);
}

export async function getWhatsAppConnectionConnectData(instanceName: string) {
  const { data } = await apiClient.get(whatsappEndpoints.connect(instanceName));
  const item = extractItemPayload(data, ['data', 'connection', 'connect', 'instance']);
  return normalizeConnection(item ?? data, instanceName);
}

export async function disconnectWhatsAppConnection(instanceName: string) {
  try {
    const { data } = await apiClient.delete(whatsappEndpoints.connection(instanceName));
    const item = extractItemPayload(data, ['data', 'connection', 'instance']);
    return item ? normalizeConnection(item, instanceName) : null;
  } catch (firstError) {
    if (!isWhatsAppMissingEndpointError(firstError)) {
      throw firstError;
    }

    try {
      const { data } = await apiClient.post(whatsappEndpoints.disconnect(instanceName));
      const item = extractItemPayload(data, ['data', 'connection', 'instance']);
      return item ? normalizeConnection(item, instanceName) : null;
    } catch (secondError) {
      if (!isWhatsAppMissingEndpointError(secondError)) {
        throw secondError;
      }

      const { data } = await apiClient.post(whatsappEndpoints.logout(instanceName));
      const item = extractItemPayload(data, ['data', 'connection', 'instance']);
      return item ? normalizeConnection(item, instanceName) : null;
    }
  }
}

export async function sendWhatsAppTextMessage(instanceName: string, payload: SendWhatsAppTextMessagePayload) {
  const { data } = await apiClient.post(whatsappEndpoints.sendTextMessage(instanceName), {
    number: payload.number.trim(),
    text: payload.text.trim(),
  });

  return data;
}

export async function getWhatsAppGroups(instanceName: string) {
  const { data } = await apiClient.get(whatsappEndpoints.groups(instanceName));
  return extractListPayload(data, ['data', 'groups', 'results'])
    .map((item) => normalizeGroup(item))
    .filter((item): item is WhatsAppGroup => item !== null);
}

export async function getWhatsAppConversations(params: ListWhatsAppConversationsParams = {}) {
  const queryParams: Record<string, string | boolean> = {};

  if (params.search?.trim()) {
    queryParams.search = params.search.trim();
  }

  if (params.unreadOnly) {
    queryParams.unreadOnly = true;
  }

  if (params.channel) {
    queryParams.channel = params.channel;
  }

  const { data } = await apiClient.get(whatsappEndpoints.conversations, {
    params: queryParams,
  });

  return extractListPayload(data, ['data', 'conversations', 'items', 'results'])
    .map((item) => normalizeConversation(item))
    .filter((item): item is WhatsAppConversationSummary => item !== null);
}

export async function getWhatsAppConversationMessages(conversationId: string) {
  const { data } = await apiClient.get(whatsappEndpoints.conversationMessages(conversationId));

  return extractListPayload(data, ['data', 'messages', 'items', 'results'])
    .map((item) => normalizeConversationMessage(item))
    .filter((item): item is WhatsAppConversationMessage => item !== null);
}

export async function sendWhatsAppConversationMessage(
  conversationId: string,
  payload: SendWhatsAppConversationMessagePayload,
) {
  const { data } = await apiClient.post(whatsappEndpoints.conversationMessages(conversationId), {
    text: payload.text.trim(),
  });

  const item = extractItemPayload(data, ['data', 'message', 'item']);
  return item ? normalizeConversationMessage(item) : null;
}

export async function markWhatsAppConversationRead(conversationId: string) {
  const { data } = await apiClient.post(whatsappEndpoints.conversationRead(conversationId));
  return data;
}
