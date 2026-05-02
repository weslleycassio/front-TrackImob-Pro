import { apiClient } from '../api/client';
import type { EntityId } from '../api/types';
import type {
  RealEstateWhatsAppConfig,
  SaveRealEstateWhatsAppConfigPayload,
  WhatsAppConnection,
  WhatsAppGroup,
  WhatsAppMessageLog,
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

function toNullableId(value: unknown): EntityId | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return null;
}

function toBooleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function toOptionalDate(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

function normalizeStatus(value: unknown) {
  const rawValue = toStringValue(value, 'PENDING').trim();
  return rawValue.length > 0 ? rawValue.toUpperCase() : 'PENDING';
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
  return compactValue.length > 120 && /^[A-Za-z0-9+/=]+$/.test(compactValue)
    ? `data:image/png;base64,${compactValue}`
    : rawValue;
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

function normalizePhoneNumber(value: unknown) {
  const rawValue = toNullableString(value);

  if (!rawValue) {
    return null;
  }

  return rawValue.includes('@') ? rawValue.split('@')[0] ?? rawValue : rawValue;
}

function normalizeConnection(raw: unknown, fallbackInstanceName = ''): WhatsAppConnection {
  const connection = isRecord(raw) ? raw : {};
  const connectData = isRecord(connection.connectData) ? connection.connectData : {};
  const status = normalizeStatus(
    connection.status ?? connection.state ?? connection.connectionStatus ?? connection.instanceStatus,
  );
  const qrCodeBase64 = normalizeImageSource(
    connection.qrCodeBase64 ??
      connection.qrCode ??
      connection.qrcode ??
      connection.base64 ??
      connection.qr ??
      connectData.qrCodeBase64 ??
      connectData.qrCode ??
      connectData.qrcode ??
      connectData.base64 ??
      connectData.qr,
  );

  return {
    instanceName:
      toStringValue(connection.instanceName ?? connection.instance ?? connection.name ?? connection.instance_id) ||
      fallbackInstanceName,
    status,
    connectedNumber: normalizePhoneNumber(
      connection.connectedNumber ?? connection.phoneNumber ?? connection.number ?? connection.ownerJid ?? connection.owner,
    ),
    qrCodeBase64,
    pairingCode: toNullableString(connection.pairingCode ?? connection.pairing_code ?? connectData.pairingCode),
    profileName: toNullableString(connection.profileName ?? connection.profile_name ?? connection.pushName),
    serverUrl: toNullableString(connection.serverUrl ?? connection.server_url ?? connection.baseUrl),
    lastError: toNullableString(connection.lastError ?? connection.error ?? connection.errorMessage ?? connection.message),
    updatedAt: toOptionalDate(connection.updatedAt ?? connection.updated_at ?? connection.lastUpdate),
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

  return {
    id,
    name: toStringValue(group.name ?? group.subject ?? group.groupName ?? group.displayName, id),
    description: toNullableString(group.description ?? group.desc),
    owner: normalizePhoneNumber(group.owner ?? group.ownerJid ?? group.ownerNumber),
    participantsCount:
      toOptionalNumber(group.participantsCount ?? group.size ?? group.membersCount) ??
      (Array.isArray(group.participants) ? group.participants.length : null),
  };
}

function normalizeRealEstateConfig(raw: unknown, fallbackRealEstateId: EntityId): RealEstateWhatsAppConfig {
  const config = isRecord(raw) ? raw : {};

  return {
    realEstateId: toNullableId(config.realEstateId ?? config.imobiliariaId ?? config.imobiliaria_id) ?? fallbackRealEstateId,
    groupId: toNullableString(config.groupId ?? config.group_id ?? config.whatsappGroupId ?? config.whatsapp_group_id),
    groupName: toNullableString(config.groupName ?? config.group_name ?? config.whatsappGroupName),
    enabled: toBooleanValue(config.enabled ?? config.ativo ?? config.active, false),
    createdAt: toOptionalDate(config.createdAt ?? config.created_at),
    updatedAt: toOptionalDate(config.updatedAt ?? config.updated_at),
  };
}

function normalizeMessageLog(raw: unknown): WhatsAppMessageLog | null {
  const log = isRecord(raw) ? raw : {};
  const id = toNullableId(log.id ?? log.logId);

  if (id === null) {
    return null;
  }

  return {
    id,
    realEstateId: toNullableId(log.realEstateId ?? log.imobiliariaId ?? log.real_estate_id),
    realEstateName: toNullableString(log.realEstateName ?? log.imobiliariaNome ?? log.imobiliaria_name),
    userId: toNullableId(log.userId ?? log.usuarioId ?? log.user_id),
    userName: toNullableString(log.userName ?? log.usuarioNome ?? log.user_name),
    groupId: toNullableString(log.groupId ?? log.group_id),
    groupName: toNullableString(log.groupName ?? log.group_name),
    targetType: toStringValue(log.targetType ?? log.target_type ?? log.type, 'group'),
    message: toStringValue(log.message ?? log.text ?? log.body),
    status: toStringValue(log.status, 'pending'),
    errorMessage: toNullableString(log.errorMessage ?? log.error_message ?? log.error),
    createdAt: toOptionalDate(log.createdAt ?? log.created_at),
    sentAt: toOptionalDate(log.sentAt ?? log.sent_at),
  };
}

export async function getAdminWhatsAppStatus() {
  const { data } = await apiClient.get('/admin/whatsapp/status');
  const item = extractItemPayload(data, ['data', 'connection', 'instance', 'status']);
  return item ? normalizeConnection(item) : null;
}

export async function createAdminWhatsAppInstance(instanceName?: string) {
  const body = instanceName?.trim() ? { instanceName: instanceName.trim() } : {};
  const { data } = await apiClient.post('/admin/whatsapp/instance', body);
  const item = extractItemPayload(data, ['data', 'connection', 'instance']);
  return normalizeConnection(item ?? body, instanceName);
}

export async function getAdminWhatsAppQrCode(instanceName?: string) {
  const { data } = await apiClient.get('/admin/whatsapp/qrcode');
  const item = extractItemPayload(data, ['data', 'connection', 'instance', 'qrcode']);
  return normalizeConnection(item ?? data, instanceName);
}

export async function logoutAdminWhatsApp() {
  const { data } = await apiClient.post('/admin/whatsapp/logout');
  const item = extractItemPayload(data, ['data', 'connection', 'instance']);
  return item ? normalizeConnection(item) : null;
}

export async function restartAdminWhatsApp() {
  const { data } = await apiClient.post('/admin/whatsapp/restart');
  const item = extractItemPayload(data, ['data', 'connection', 'instance']);
  return item ? normalizeConnection(item) : null;
}

export async function getAdminWhatsAppGroups() {
  const { data } = await apiClient.get('/admin/whatsapp/groups');
  return extractListPayload(data, ['data', 'groups', 'items', 'results'])
    .map(normalizeGroup)
    .filter((group): group is WhatsAppGroup => group !== null);
}

export async function getRealEstateWhatsAppConfig(realEstateId: EntityId) {
  const { data } = await apiClient.get(`/admin/real-estates/${realEstateId}/whatsapp-config`);
  const item = extractItemPayload(data, ['data', 'config', 'whatsappConfig']);
  return normalizeRealEstateConfig(item, realEstateId);
}

export async function saveRealEstateWhatsAppConfig(
  realEstateId: EntityId,
  payload: SaveRealEstateWhatsAppConfigPayload,
) {
  const { data } = await apiClient.put(`/admin/real-estates/${realEstateId}/whatsapp-config`, payload);
  const item = extractItemPayload(data, ['data', 'config', 'whatsappConfig']);
  return normalizeRealEstateConfig(item, realEstateId);
}

export async function sendRealEstateWhatsAppGroupTest(realEstateId: EntityId, message: string) {
  const { data } = await apiClient.post(`/admin/real-estates/${realEstateId}/whatsapp/test-group`, {
    message: message.trim(),
  });
  return data;
}

export async function getAdminWhatsAppLogs() {
  const { data } = await apiClient.get('/admin/whatsapp/logs');
  return extractListPayload(data, ['data', 'logs', 'items', 'results'])
    .map(normalizeMessageLog)
    .filter((log): log is WhatsAppMessageLog => log !== null);
}
