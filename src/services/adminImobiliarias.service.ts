import { apiClient } from '../api/client';
import type {
  AdminImobiliaria,
  CreateAdminImobiliariaRequest,
  EntityId,
  UpdateAdminImobiliariaConfigPayload,
} from '../api/types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function toEntityId(value: unknown): EntityId {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return '';
}

function toStringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toNullableString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toBooleanValue(value: unknown, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim().replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toOptionalDate(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractListPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ['data', 'imobiliarias', 'items', 'results']) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractItemPayload(payload: unknown) {
  if (!isRecord(payload) || Array.isArray(payload)) {
    return null;
  }

  for (const key of ['data', 'imobiliaria', 'item']) {
    const candidate = payload[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  return payload;
}

function normalizeAdminWhatsAppConfig(raw: unknown) {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    groupId: toNullableString(raw.groupId ?? raw.group_id ?? raw.whatsappGroupId ?? raw.whatsapp_group_id),
    groupName: toNullableString(raw.groupName ?? raw.group_name ?? raw.whatsappGroupName ?? raw.whatsapp_group_name),
    enabled: toBooleanValue(raw.enabled ?? raw.ativo ?? raw.active, false),
  };
}

function normalizeAdminImobiliaria(raw: unknown): AdminImobiliaria {
  const imobiliaria = isRecord(raw) ? raw : {};
  const usuariosAtivos =
    toOptionalNumber(
      imobiliaria.usuariosAtivos ??
        imobiliaria.totalUsuariosAtivos ??
        imobiliaria.activeUsers ??
        imobiliaria.usersActiveCount ??
        imobiliaria.qtdUsuariosAtivos,
    ) ?? 0;
  const whatsappConfig = normalizeAdminWhatsAppConfig(
    imobiliaria.whatsappConfig ??
      imobiliaria.whatsapp_config ??
      imobiliaria.realEstateWhatsappConfig ??
      imobiliaria.whatsapp,
  );

  return {
    id: toEntityId(imobiliaria.id ?? imobiliaria.imobiliariaId),
    nome: toStringValue(imobiliaria.nome ?? imobiliaria.name ?? imobiliaria.razaoSocial, 'Imobiliaria'),
    telefone: toNullableString(imobiliaria.telefone ?? imobiliaria.phone),
    email: toNullableString(imobiliaria.email),
    cnpj: toNullableString(imobiliaria.cnpj),
    ativa: toBooleanValue(imobiliaria.ativa ?? imobiliaria.ativo ?? imobiliaria.active, true),
    usuariosAtivos,
    limiteUsuarios: toOptionalNumber(
      imobiliaria.limiteUsuarios ??
        imobiliaria.userLimit ??
        imobiliaria.maxUsers ??
        imobiliaria.quantidadeMaximaUsuarios,
    ),
    whatsappConfig,
    createdAt: toOptionalDate(imobiliaria.createdAt),
    updatedAt: toOptionalDate(imobiliaria.updatedAt),
  };
}

function sanitizeConfigPayload(payload: UpdateAdminImobiliariaConfigPayload) {
  const body: UnknownRecord = {};

  if (payload.limiteUsuarios !== undefined) {
    body.limiteUsuarios = payload.limiteUsuarios;
  }

  if (payload.ativa !== undefined) {
    body.ativa = payload.ativa;
  }

  return body;
}

export async function getAdminImobiliarias() {
  const { data } = await apiClient.get('/admin/imobiliarias');

  return extractListPayload(data)
    .map(normalizeAdminImobiliaria)
    .filter((imobiliaria) => String(imobiliaria.id).length > 0);
}

export async function getAdminImobiliariaById(imobiliariaId: EntityId) {
  const { data } = await apiClient.get(`/admin/imobiliarias/${imobiliariaId}`);
  const imobiliaria = extractItemPayload(data);

  return normalizeAdminImobiliaria(imobiliaria);
}

export async function createAdminImobiliaria(payload: CreateAdminImobiliariaRequest) {
  const { data } = await apiClient.post('/admin/imobiliarias', payload);
  const imobiliaria = extractItemPayload(data);
  const normalizedImobiliaria = imobiliaria ? normalizeAdminImobiliaria(imobiliaria) : null;

  if (normalizedImobiliaria && String(normalizedImobiliaria.id).length > 0) {
    return getAdminImobiliariaById(normalizedImobiliaria.id);
  }

  return normalizedImobiliaria;
}

export async function updateAdminImobiliariaConfig(
  imobiliariaId: EntityId,
  payload: UpdateAdminImobiliariaConfigPayload,
) {
  const { data } = await apiClient.patch(`/admin/imobiliarias/${imobiliariaId}/config`, sanitizeConfigPayload(payload));
  const imobiliaria = extractItemPayload(data);

  return imobiliaria ? normalizeAdminImobiliaria(imobiliaria) : getAdminImobiliariaById(imobiliariaId);
}

export async function inativarAdminImobiliaria(imobiliariaId: EntityId) {
  const { data } = await apiClient.patch(`/admin/imobiliarias/${imobiliariaId}/inativar`);
  const imobiliaria = extractItemPayload(data);

  return imobiliaria ? normalizeAdminImobiliaria(imobiliaria) : getAdminImobiliariaById(imobiliariaId);
}

export async function reativarAdminImobiliaria(imobiliariaId: EntityId) {
  const { data } = await apiClient.patch(`/admin/imobiliarias/${imobiliariaId}/reativar`);
  const imobiliaria = extractItemPayload(data);

  return imobiliaria ? normalizeAdminImobiliaria(imobiliaria) : getAdminImobiliariaById(imobiliariaId);
}
