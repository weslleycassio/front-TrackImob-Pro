import axios from 'axios';
import { apiClient } from '../api/client';
import { crmEndpoints } from '../api/endpoints/crm';
import type { EntityId, UserRole } from '../api/types';
import type {
  CrmAssignableUser,
  CrmContact,
  CrmContactLeadSummary,
  CreateCrmLeadPayload,
  CreateCrmPipelinePayload,
  CreateCrmStagePayload,
  CrmLead,
  CrmLeadFinancialProfile,
  CrmLeadPipelineSummary,
  CrmLeadStageHistoryItem,
  CrmLeadStageSummary,
  CrmLeadUserSummary,
  CrmPipeline,
  CrmPipelineDetails,
  CrmPipelineStage,
  CrmPipelineStageType,
  ListCrmContactsParams,
  ListCrmLeadsParams,
  MoveCrmLeadPayload,
  ReorderCrmStagesPayload,
  UpdateCrmContactPayload,
  UpdateCrmLeadPayload,
  UpdateCrmLeadResponsaveisPayload,
  UpdateCrmPipelinePayload,
  UpdateCrmStagePayload,
} from '../types/crm';

type UnknownRecord = Record<string, unknown>;

const stageTypes: CrmPipelineStageType[] = ['FRIO', 'QUENTE', 'PERDIDO', 'CONCLUIDO_COM_SUCESSO'];
const userRoles: UserRole[] = ['ADMIN', 'CORRETOR'];
const legacyStageTypeMap: Record<string, CrmPipelineStageType> = {
  OPEN: 'FRIO',
  WON: 'CONCLUIDO_COM_SUCESSO',
  LOST: 'PERDIDO',
};

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

function toBooleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function toOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function parseNumericString(value: string) {
  const normalized = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return parseNumericString(value);
  }

  return null;
}

function toRequiredNumber(value: unknown, fallback = 0) {
  const parsed = toOptionalNumber(value);
  return parsed ?? fallback;
}

function toOptionalDate(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toNullableDate(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toStageType(value: unknown): CrmPipelineStageType {
  if (stageTypes.includes(value as CrmPipelineStageType)) {
    return value as CrmPipelineStageType;
  }

  if (typeof value === 'string' && value in legacyStageTypeMap) {
    return legacyStageTypeMap[value];
  }

  return 'FRIO';
}

function toUserRole(value: unknown) {
  if (userRoles.includes(value as UserRole)) {
    return value as UserRole;
  }

  return null;
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
  if (isRecord(payload) && !Array.isArray(payload)) {
    for (const key of itemKeys) {
      const candidate = payload[key];
      if (isRecord(candidate)) {
        return candidate;
      }
    }

    return payload;
  }

  return null;
}

function normalizePipeline(raw: unknown): CrmPipeline {
  const pipeline = isRecord(raw) ? raw : {};

  return {
    id: toEntityId(pipeline.id),
    nome: toStringValue(pipeline.nome),
    ativo: toBooleanValue(pipeline.ativo),
    imobiliariaId: pipeline.imobiliariaId !== undefined ? toEntityId(pipeline.imobiliariaId) : undefined,
    createdByUserId: pipeline.createdByUserId !== undefined ? toEntityId(pipeline.createdByUserId) : undefined,
    createdAt: toOptionalDate(pipeline.createdAt),
    updatedAt: toOptionalDate(pipeline.updatedAt),
  };
}

function normalizeStage(raw: unknown): CrmPipelineStage {
  const stage = isRecord(raw) ? raw : {};

  return {
    id: toEntityId(stage.id),
    pipelineId: toEntityId(stage.pipelineId),
    nome: toStringValue(stage.nome),
    ordem: toRequiredNumber(stage.ordem),
    cor: toNullableString(stage.cor),
    tipo: toStageType(stage.tipo),
    slaHoras: toOptionalNumber(stage.slaHoras),
    ativa: toBooleanValue(stage.ativa, true),
    createdAt: toOptionalDate(stage.createdAt),
    updatedAt: toOptionalDate(stage.updatedAt),
  };
}

function normalizePipelineDetails(raw: unknown): CrmPipelineDetails {
  const pipeline = isRecord(raw) ? raw : {};

  return {
    ...normalizePipeline(pipeline),
    stages: extractListPayload(pipeline.stages, ['data', 'stages']).map(normalizeStage).sort((left, right) => left.ordem - right.ordem),
  };
}

function normalizeLeadPipelineSummary(raw: unknown): CrmLeadPipelineSummary | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    id: toEntityId(raw.id ?? raw.pipelineId ?? raw.crmPipelineId),
    nome: toStringValue(raw.nome ?? raw.name),
    ativo: toBooleanValue(raw.ativo ?? raw.ativoNoPipeline, true),
  };
}

function normalizeLeadStageSummary(raw: unknown): CrmLeadStageSummary | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    id: toEntityId(raw.id ?? raw.stageId ?? raw.colunaId ?? raw.crmPipelineStageId ?? raw.statusId),
    pipelineId: toEntityId(raw.pipelineId ?? raw.crmPipelineId),
    nome: toStringValue(raw.nome ?? raw.name),
    ordem: toRequiredNumber(raw.ordem),
    cor: toNullableString(raw.cor),
    tipo: toStageType(raw.tipo),
    ativa: toBooleanValue(raw.ativa ?? raw.ativaNoPipeline, true),
  };
}

function normalizeLeadUser(raw: unknown): CrmLeadUserSummary {
  if (typeof raw === 'string' || typeof raw === 'number') {
    return {
      id: raw,
      nome: 'Usuario',
    };
  }

  const user = isRecord(raw) ? raw : {};

  return {
    id:
      user.id !== undefined
        ? toEntityId(user.id)
        : user.userId !== undefined
          ? toEntityId(user.userId)
          : user.usuarioId !== undefined
            ? toEntityId(user.usuarioId)
            : '',
    nome:
      toStringValue(user.nome) ||
      toStringValue(user.name) ||
      toStringValue(user.fullName) ||
      toStringValue(user.email) ||
      'Usuario',
    email: toNullableString(user.email),
    telefone: toNullableString(user.telefone ?? user.phone),
    role: toUserRole(user.role),
  };
}

function normalizeAssignableUser(raw: unknown): CrmAssignableUser {
  const user = isRecord(raw) ? raw : {};

  return {
    id: toEntityId(user.id),
    nome:
      toStringValue(user.nome) ||
      toStringValue(user.name) ||
      toStringValue(user.fullName) ||
      toStringValue(user.email) ||
      'Usuario',
    email: toNullableString(user.email),
    role: toUserRole(user.role),
    ativo: toBooleanValue(user.ativo, true),
  };
}

function normalizeLeadUsersCollection(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(normalizeLeadUser).filter((user) => String(user.id).length > 0);
  }

  if (isRecord(value)) {
    return [normalizeLeadUser(value)].filter((user) => String(user.id).length > 0);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return [normalizeLeadUser(value)];
  }

  return [];
}

function normalizeLeadFinancialProfile(raw: unknown): CrmLeadFinancialProfile | null {
  if (!isRecord(raw)) {
    return null;
  }

  const valorEntrada = toOptionalNumber(raw.valorEntrada ?? raw.entrada ?? raw.ato ?? raw.entradaAto);
  const fgts = toOptionalNumber(raw.fgts ?? raw.valorFgts);
  const rendaMensal = toOptionalNumber(raw.rendaMensal ?? raw.renda ?? raw.valorRenda);
  const dataNascimento = toNullableDate(raw.dataNascimento ?? raw.birthDate);

  const hasAnyValue =
    raw.id !== undefined ||
    raw.leadId !== undefined ||
    valorEntrada !== null ||
    fgts !== null ||
    rendaMensal !== null ||
    dataNascimento !== null;

  if (!hasAnyValue) {
    return null;
  }

  return {
    id: raw.id !== undefined ? toEntityId(raw.id) : undefined,
    leadId: raw.leadId !== undefined ? toEntityId(raw.leadId) : undefined,
    valorEntrada,
    fgts,
    rendaMensal,
    dataNascimento,
    updatedAt: toOptionalDate(raw.updatedAt),
  };
}

function normalizeLeadStageHistoryItem(raw: unknown): CrmLeadStageHistoryItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const durationInMilliseconds = toOptionalNumber(
    raw.durationMs ??
      raw.durationInMs ??
      raw.tempoNaEtapaMs ??
      raw.tempoNaColunaMs ??
      raw.stageDurationMs ??
      raw.stageTimeMs,
  );
  const durationInSeconds = toOptionalNumber(
    raw.durationSeconds ??
      raw.durationInSeconds ??
      raw.tempoNaEtapaSegundos ??
      raw.tempoNaColunaSegundos ??
      raw.stageDurationSeconds,
  );
  const durationMs = durationInMilliseconds ?? (durationInSeconds !== null ? durationInSeconds * 1000 : null);

  return {
    id: toEntityId(raw.id),
    leadId: toEntityId(raw.leadId),
    fromStageId:
      raw.fromStageId !== undefined && raw.fromStageId !== null
        ? toEntityId(raw.fromStageId)
        : raw.previousStageId !== undefined && raw.previousStageId !== null
          ? toEntityId(raw.previousStageId)
          : raw.colunaOrigemId !== undefined && raw.colunaOrigemId !== null
            ? toEntityId(raw.colunaOrigemId)
            : null,
    toStageId: toEntityId(raw.toStageId ?? raw.stageId ?? raw.currentStageId ?? raw.colunaDestinoId ?? raw.crmPipelineStageId),
    movedByUserId:
      raw.movedByUserId !== undefined && raw.movedByUserId !== null
        ? toEntityId(raw.movedByUserId)
        : raw.userId !== undefined && raw.userId !== null
          ? toEntityId(raw.userId)
          : raw.usuarioId !== undefined && raw.usuarioId !== null
            ? toEntityId(raw.usuarioId)
            : null,
    enteredAt: toOptionalDate(raw.enteredAt ?? raw.enteredStageAt ?? raw.enteredColumnAt ?? raw.startedAt ?? raw.movedAt ?? raw.createdAt),
    exitedAt: toNullableDate(raw.exitedAt ?? raw.leftStageAt ?? raw.leftColumnAt ?? raw.finishedAt ?? raw.endedAt),
    durationMs,
    isCurrent: toOptionalBoolean(raw.isCurrent ?? raw.current ?? raw.etapaAtual ?? raw.colunaAtual),
    movedAt: toOptionalDate(raw.movedAt ?? raw.createdAt),
    fromStage: normalizeLeadStageSummary(raw.fromStage),
    toStage: normalizeLeadStageSummary(raw.toStage),
    movedByUser: isRecord(raw.movedByUser) ? normalizeLeadUser(raw.movedByUser) : null,
  };
}

function normalizeLead(raw: unknown): CrmLead {
  const lead = isRecord(raw) ? raw : {};
  const financialProfile = normalizeLeadFinancialProfile(lead.financialProfile);
  const normalizedPipeline =
    normalizeLeadPipelineSummary(lead.pipeline ?? lead.crmPipeline ?? lead.funil ?? lead.pipelineResumo) ?? null;
  const normalizedStage =
    normalizeLeadStageSummary(lead.stage ?? lead.crmPipelineStage ?? lead.coluna ?? lead.status ?? lead.stageResumo) ?? null;

  const responsaveis =
    normalizeLeadUsersCollection(
      lead.responsaveis ?? lead.responsavelUsers ?? lead.responsavelUsuarios ?? lead.responsavel ?? lead.responsavelUser,
    ) || [];
  const coResponsaveis =
    normalizeLeadUsersCollection(
      lead.coResponsaveis ?? lead.coResponsavelUsers ?? lead.coResponsavelUsuarios ?? lead.coresponsaveis ?? lead.coResponsavel,
    ) || [];
  const stageHistory = extractListPayload(
    lead.stageHistory ?? lead.historicoEtapas ?? lead.historicoColunas ?? lead.stageMovements,
    ['data', 'stageHistory', 'historicoEtapas', 'historicoColunas', 'movements'],
  )
    .map(normalizeLeadStageHistoryItem)
    .filter((item): item is CrmLeadStageHistoryItem => item !== null);
  const currentStageDurationInMilliseconds = toOptionalNumber(
    lead.currentStageDurationMs ??
      lead.currentStageTimeMs ??
      lead.tempoEtapaAtualMs ??
      lead.tempoColunaAtualMs ??
      lead.stageDurationMs,
  );
  const currentStageDurationInSeconds = toOptionalNumber(
    lead.currentStageDurationSeconds ??
      lead.currentStageTimeSeconds ??
      lead.tempoEtapaAtualSegundos ??
      lead.tempoColunaAtualSegundos ??
      lead.stageDurationSeconds,
  );
  const currentStageDurationMs =
    currentStageDurationInMilliseconds ?? (currentStageDurationInSeconds !== null ? currentStageDurationInSeconds * 1000 : null);

  return {
    id: toEntityId(lead.id),
    nome: toStringValue(lead.nome ?? lead.name ?? lead.titulo),
    telefone: toNullableString(lead.telefone ?? lead.phone ?? lead.celular),
    email: toNullableString(lead.email),
    origem: toNullableString(lead.origem ?? lead.source ?? lead.origemLead),
    informacoesAdicionais: toNullableString(
      lead.informacoesAdicionais ?? lead.observacoes ?? lead.observacao ?? lead.descricao ?? lead.notes ?? lead.note,
    ),
    pipelineId: toEntityId(lead.pipelineId ?? lead.crmPipelineId ?? normalizedPipeline?.id),
    stageId: toEntityId(lead.stageId ?? lead.colunaId ?? lead.crmPipelineStageId ?? lead.statusId ?? normalizedStage?.id),
    entrada: financialProfile?.valorEntrada ?? toOptionalNumber(lead.entrada ?? lead.ato ?? lead.entradaAto ?? lead.valorEntrada),
    fgts: financialProfile?.fgts ?? toOptionalNumber(lead.fgts ?? lead.valorFgts),
    renda: financialProfile?.rendaMensal ?? toOptionalNumber(lead.renda ?? lead.rendaMensal ?? lead.valorRenda),
    dataNascimento: financialProfile?.dataNascimento ?? toNullableDate(lead.dataNascimento ?? lead.birthDate),
    responsaveis,
    coResponsaveis,
    financialProfile,
    pipeline: normalizedPipeline,
    stage: normalizedStage,
    createdByUser: isRecord(lead.createdByUser) ? normalizeLeadUser(lead.createdByUser) : null,
    enteredCurrentStageAt: toNullableDate(
      lead.enteredCurrentStageAt ??
        lead.currentStageEnteredAt ??
        lead.currentStageStartedAt ??
        lead.enteredStageAt ??
        lead.enteredColumnAt ??
        lead.entradaEtapaAtualEm ??
        lead.entradaColunaAtualEm,
    ),
    currentStageDurationMs,
    stageHistory,
    createdByUserId:
      lead.createdByUserId !== undefined
        ? toEntityId(lead.createdByUserId)
        : lead.usuarioCriadorId !== undefined
          ? toEntityId(lead.usuarioCriadorId)
          : undefined,
    createdAt: toOptionalDate(lead.createdAt),
    updatedAt: toOptionalDate(lead.updatedAt),
  };
}

function normalizeContactLeadSummary(raw: unknown): CrmContactLeadSummary | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    id: toEntityId(raw.id),
    nome: toStringValue(raw.nome ?? raw.name ?? raw.titulo),
    telefone: toNullableString(raw.telefone ?? raw.phone ?? raw.celular),
    email: toNullableString(raw.email),
    origem: toNullableString(raw.origem ?? raw.source ?? raw.origemLead),
    pipeline: normalizeLeadPipelineSummary(raw.pipeline),
    stage: normalizeLeadStageSummary(raw.stage),
    createdAt: toOptionalDate(raw.createdAt),
    updatedAt: toOptionalDate(raw.updatedAt),
  };
}

function normalizeContact(raw: unknown): CrmContact {
  const contact = isRecord(raw) ? raw : {};
  const leads = extractListPayload(
    contact.leads ?? contact.crmLeads ?? contact.linkedLeads ?? contact.leadsVinculados ?? contact.leadings,
    ['data', 'leads', 'crmLeads'],
  )
    .map(normalizeContactLeadSummary)
    .filter((lead): lead is CrmContactLeadSummary => lead !== null && String(lead.id).length > 0);

  return {
    id: toEntityId(contact.id),
    nome:
      toStringValue(contact.nome) ||
      toStringValue(contact.name) ||
      toStringValue(contact.fullName) ||
      toStringValue(contact.email) ||
      'Contato',
    telefone: toNullableString(contact.telefone ?? contact.phone ?? contact.celular),
    email: toNullableString(contact.email),
    createdAt: toOptionalDate(contact.createdAt),
    updatedAt: toOptionalDate(contact.updatedAt),
    leadsCount:
      toOptionalNumber(
        contact.leadsCount ?? contact.totalLeads ?? contact.leadCount ?? contact.quantidadeLeads ?? contact.qtdLeads,
      ) ?? leads.length,
    leads,
  };
}

function sanitizePipelinePayload(payload: CreateCrmPipelinePayload | UpdateCrmPipelinePayload) {
  const body: UnknownRecord = {};

  if (payload.nome !== undefined) {
    body.nome = payload.nome.trim();
  }

  if (payload.ativo !== undefined) {
    body.ativo = payload.ativo;
  }

  return body;
}

function sanitizeStagePayload(payload: CreateCrmStagePayload | UpdateCrmStagePayload) {
  const body: UnknownRecord = {};

  if ('pipelineId' in payload && payload.pipelineId !== undefined) {
    body.pipelineId = payload.pipelineId;
  }

  if (payload.nome !== undefined) {
    body.nome = payload.nome.trim();
  }

  if (payload.ordem !== undefined) {
    body.ordem = payload.ordem;
  }

  if (payload.cor !== undefined) {
    body.cor = payload.cor;
  }

  if (payload.tipo !== undefined) {
    body.tipo = payload.tipo;
  }

  if (payload.slaHoras !== undefined) {
    body.slaHoras = payload.slaHoras;
  }

  if (payload.ativa !== undefined) {
    body.ativa = payload.ativa;
  }

  return body;
}

function sanitizeLeadPayload(payload: CreateCrmLeadPayload | UpdateCrmLeadPayload) {
  const body: UnknownRecord = {};

  if (payload.nome !== undefined) {
    body.nome = payload.nome.trim();
  }

  if (payload.telefone !== undefined) {
    body.telefone = payload.telefone;
  }

  if (payload.email !== undefined) {
    body.email = typeof payload.email === 'string' ? payload.email.trim() : payload.email;
  }

  if (payload.origem !== undefined) {
    body.origem = payload.origem.trim();
  }

  if (payload.informacoesAdicionais !== undefined) {
    body.informacoesAdicionais =
      typeof payload.informacoesAdicionais === 'string' ? payload.informacoesAdicionais.trim() : payload.informacoesAdicionais;
  }

  if (payload.pipelineId !== undefined) {
    body.pipelineId = payload.pipelineId;
  }

  if (payload.stageId !== undefined) {
    body.stageId = payload.stageId;
  }

  if (payload.responsaveis !== undefined) {
    body.responsaveis = payload.responsaveis;
  }

  if (payload.coResponsaveis !== undefined) {
    body.coResponsaveis = payload.coResponsaveis;
  }

  if (payload.financialProfile !== undefined) {
    if (payload.financialProfile === null) {
      body.financialProfile = null;
    } else {
      const financialProfile: UnknownRecord = {};

      if (payload.financialProfile.valorEntrada !== undefined) {
        financialProfile.valorEntrada = payload.financialProfile.valorEntrada;
      }

      if (payload.financialProfile.fgts !== undefined) {
        financialProfile.fgts = payload.financialProfile.fgts;
      }

      if (payload.financialProfile.rendaMensal !== undefined) {
        financialProfile.rendaMensal = payload.financialProfile.rendaMensal;
      }

      if (payload.financialProfile.dataNascimento !== undefined) {
        financialProfile.dataNascimento = payload.financialProfile.dataNascimento;
      }

      body.financialProfile = financialProfile;
    }
  }

  return body;
}

function sanitizeContactPayload(payload: UpdateCrmContactPayload) {
  const body: UnknownRecord = {};

  if (payload.nome !== undefined) {
    body.nome = payload.nome.trim();
  }

  if (payload.telefone !== undefined) {
    body.telefone = payload.telefone;
  }

  if (payload.email !== undefined) {
    body.email = typeof payload.email === 'string' ? payload.email.trim() : payload.email;
  }

  return body;
}

function extractLeadItem(data: unknown) {
  const item = extractItemPayload(data, ['data', 'lead']);
  return item ? normalizeLead(item) : null;
}

function isMissingEndpointError(error: unknown) {
  return axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405);
}

function withApiPrefix(path: string) {
  return path.startsWith('/api/') ? path : `/api${path}`;
}

export async function getCrmPipelines() {
  const { data } = await apiClient.get(crmEndpoints.pipelines);
  return extractListPayload(data, ['data', 'pipelines']).map(normalizePipeline);
}

export async function getCrmAssignableUsers() {
  const { data } = await apiClient.get(crmEndpoints.assignableUsers);
  return extractListPayload(data, ['data', 'users', 'usuarios'])
    .map(normalizeAssignableUser)
    .filter((user) => String(user.id).length > 0);
}

export async function getActiveCrmPipeline(): Promise<CrmPipeline | null> {
  try {
    const details = await getActiveCrmPipelineDetails();
    return details ? normalizePipeline(details) : null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getActiveCrmPipelineDetails(): Promise<CrmPipelineDetails | null> {
  const { data } = await apiClient.get(crmEndpoints.activePipeline);
  const pipeline = extractItemPayload(data, ['data', 'pipeline']);

  return pipeline ? normalizePipelineDetails(pipeline) : null;
}

export async function createCrmPipeline(payload: CreateCrmPipelinePayload) {
  const { data } = await apiClient.post(crmEndpoints.pipelines, sanitizePipelinePayload(payload));
  const pipeline = extractItemPayload(data, ['data', 'pipeline']);

  return normalizePipeline(pipeline);
}

export async function updateCrmPipeline(pipelineId: EntityId, payload: UpdateCrmPipelinePayload) {
  const { data } = await apiClient.patch(crmEndpoints.pipeline(pipelineId), sanitizePipelinePayload(payload));
  const pipeline = extractItemPayload(data, ['data', 'pipeline']);

  return normalizePipeline(pipeline);
}

export async function getCrmStages(pipelineId: EntityId) {
  const { data } = await apiClient.get(crmEndpoints.stages, {
    params: {
      pipelineId,
    },
  });

  return extractListPayload(data, ['data', 'stages'])
    .map(normalizeStage)
    .sort((left, right) => left.ordem - right.ordem);
}

export async function createCrmStage(payload: CreateCrmStagePayload) {
  const { data } = await apiClient.post(crmEndpoints.stages, sanitizeStagePayload(payload));
  const stage = extractItemPayload(data, ['data', 'stage']);

  return normalizeStage(stage);
}

export async function updateCrmStage(stageId: EntityId, payload: UpdateCrmStagePayload) {
  const { data } = await apiClient.patch(crmEndpoints.stage(stageId), sanitizeStagePayload(payload));
  const stage = extractItemPayload(data, ['data', 'stage']);

  return normalizeStage(stage);
}

export async function deleteCrmStage(stageId: EntityId) {
  const { data } = await apiClient.delete(crmEndpoints.stage(stageId));
  const stage = extractItemPayload(data, ['data', 'stage']);

  return stage ? normalizeStage(stage) : null;
}

export async function reorderCrmStages(payload: ReorderCrmStagesPayload) {
  const { data } = await apiClient.patch(crmEndpoints.reorderStages, {
    pipelineId: payload.pipelineId,
    stages: payload.stages.map((stage) => ({
      id: stage.id,
      ordem: stage.ordem,
    })),
  });

  const stages = extractListPayload(data, ['data', 'stages']);

  if (stages.length === 0) {
    return null;
  }

  return stages.map(normalizeStage).sort((left, right) => left.ordem - right.ordem);
}

export async function getCrmLeads(params: ListCrmLeadsParams = {}) {
  const { data } = await apiClient.get(crmEndpoints.leads, {
    params,
  });

  return extractListPayload(data, ['data', 'leads']).map(normalizeLead);
}

export async function getCrmLeadById(leadId: EntityId) {
  const { data } = await apiClient.get(crmEndpoints.lead(leadId));
  const lead = extractLeadItem(data);

  return lead ?? normalizeLead({ id: leadId });
}

export async function createCrmLead(payload: CreateCrmLeadPayload) {
  const { data } = await apiClient.post(crmEndpoints.leads, sanitizeLeadPayload(payload));
  const lead = extractLeadItem(data);

  return lead ?? normalizeLead(payload);
}

export async function updateCrmLead(leadId: EntityId, payload: UpdateCrmLeadPayload) {
  const { data } = await apiClient.patch(crmEndpoints.lead(leadId), sanitizeLeadPayload(payload));
  const lead = extractLeadItem(data);

  return lead ?? normalizeLead({ id: leadId, ...payload });
}

export async function updateCrmLeadResponsaveis(leadId: EntityId, payload: UpdateCrmLeadResponsaveisPayload) {
  const { data } = await apiClient.patch(crmEndpoints.leadResponsaveis(leadId), payload);
  const lead = extractLeadItem(data);

  return lead ?? normalizeLead({ id: leadId, ...payload });
}

export async function moveCrmLead(payload: MoveCrmLeadPayload) {
  try {
    const { data } = await apiClient.patch(crmEndpoints.lead(payload.leadId), {
      stageId: payload.stageId,
    });
    const lead = extractLeadItem(data);

    return lead ?? normalizeLead({ id: payload.leadId, stageId: payload.stageId });
  } catch (firstError) {
    if (!isMissingEndpointError(firstError)) {
      throw firstError;
    }

    try {
      const { data } = await apiClient.patch(crmEndpoints.leadStage(payload.leadId), {
        stageId: payload.stageId,
      });
      const lead = extractLeadItem(data);

      return lead ?? normalizeLead({ id: payload.leadId, stageId: payload.stageId });
    } catch (secondError) {
      if (!isMissingEndpointError(secondError)) {
        throw secondError;
      }

      const { data } = await apiClient.patch(crmEndpoints.moveLead, {
        leadId: payload.leadId,
        stageId: payload.stageId,
      });
      const lead = extractLeadItem(data);

      return lead ?? normalizeLead({ id: payload.leadId, stageId: payload.stageId });
    }
  }
}

export async function getCrmContacts(params: ListCrmContactsParams = {}) {
  try {
    const { data } = await apiClient.get(crmEndpoints.contacts, {
      params,
    });

    return extractListPayload(data, ['data', 'contacts', 'contatos'])
      .map(normalizeContact)
      .filter((contact) => String(contact.id).length > 0);
  } catch (error) {
    if (!isMissingEndpointError(error)) {
      throw error;
    }

    const { data } = await apiClient.get(withApiPrefix(crmEndpoints.contacts), {
      params,
    });

    return extractListPayload(data, ['data', 'contacts', 'contatos'])
      .map(normalizeContact)
      .filter((contact) => String(contact.id).length > 0);
  }
}

export async function getCrmContactById(contactId: EntityId) {
  try {
    const { data } = await apiClient.get(crmEndpoints.contact(contactId));
    const contact = extractItemPayload(data, ['data', 'contact', 'contato']);

    return contact ? normalizeContact(contact) : normalizeContact({ id: contactId });
  } catch (error) {
    if (!isMissingEndpointError(error)) {
      throw error;
    }

    const { data } = await apiClient.get(withApiPrefix(crmEndpoints.contact(contactId)));
    const contact = extractItemPayload(data, ['data', 'contact', 'contato']);

    return contact ? normalizeContact(contact) : normalizeContact({ id: contactId });
  }
}

export async function updateCrmContact(contactId: EntityId, payload: UpdateCrmContactPayload) {
  try {
    const { data } = await apiClient.patch(crmEndpoints.contact(contactId), sanitizeContactPayload(payload));
    const contact = extractItemPayload(data, ['data', 'contact', 'contato']);

    return contact ? normalizeContact(contact) : normalizeContact({ id: contactId, ...payload });
  } catch (error) {
    if (!isMissingEndpointError(error)) {
      throw error;
    }

    const { data } = await apiClient.patch(withApiPrefix(crmEndpoints.contact(contactId)), sanitizeContactPayload(payload));
    const contact = extractItemPayload(data, ['data', 'contact', 'contato']);

    return contact ? normalizeContact(contact) : normalizeContact({ id: contactId, ...payload });
  }
}
