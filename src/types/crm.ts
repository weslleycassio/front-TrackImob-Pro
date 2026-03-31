import type { EntityId, UserRole } from '../api/types';

export type CrmPipelineStageType = 'FRIO' | 'QUENTE' | 'PERDIDO' | 'CONCLUIDO_COM_SUCESSO';

export const crmStageTypeOptions: Array<{ value: CrmPipelineStageType; label: string }> = [
  { value: 'FRIO', label: 'Frio' },
  { value: 'QUENTE', label: 'Quente' },
  { value: 'PERDIDO', label: 'Perdido' },
  { value: 'CONCLUIDO_COM_SUCESSO', label: 'Concluido com sucesso' },
];

export const crmStageTypeLabels: Record<CrmPipelineStageType, string> = {
  FRIO: 'Frio',
  QUENTE: 'Quente',
  PERDIDO: 'Perdido',
  CONCLUIDO_COM_SUCESSO: 'Concluido com sucesso',
};

export type CrmPipeline = {
  id: EntityId;
  nome: string;
  ativo: boolean;
  imobiliariaId?: EntityId;
  createdByUserId?: EntityId;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmPipelineDetails = CrmPipeline & {
  stages: CrmPipelineStage[];
};

export type CrmPipelineStage = {
  id: EntityId;
  pipelineId: EntityId;
  nome: string;
  ordem: number;
  cor: string | null;
  tipo: CrmPipelineStageType;
  slaHoras: number | null;
  ativa: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmLeadUserSummary = {
  id: EntityId;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  role?: UserRole | null;
};

export type CrmAssignableUser = {
  id: EntityId;
  nome: string;
  email?: string | null;
  role?: UserRole | null;
  ativo: boolean;
};

export type CrmLeadFinancialProfile = {
  id?: EntityId;
  leadId?: EntityId;
  valorEntrada: number | null;
  fgts: number | null;
  rendaMensal: number | null;
  dataNascimento: string | null;
  updatedAt?: string;
};

export type CrmLeadPipelineSummary = {
  id: EntityId;
  nome: string;
  ativo: boolean;
};

export type CrmLeadStageSummary = {
  id: EntityId;
  pipelineId: EntityId;
  nome: string;
  ordem: number;
  cor: string | null;
  tipo: CrmPipelineStageType;
  ativa: boolean;
};

export type CrmLeadStageHistoryItem = {
  id: EntityId;
  leadId: EntityId;
  fromStageId: EntityId | null;
  toStageId: EntityId;
  movedByUserId: EntityId | null;
  movedAt?: string;
  fromStage?: CrmLeadStageSummary | null;
  toStage?: CrmLeadStageSummary | null;
  movedByUser?: CrmLeadUserSummary | null;
};

export type CrmLead = {
  id: EntityId;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  informacoesAdicionais: string | null;
  pipelineId: EntityId;
  stageId: EntityId;
  entrada: number | null;
  fgts: number | null;
  renda: number | null;
  dataNascimento: string | null;
  responsaveis: CrmLeadUserSummary[];
  coResponsaveis: CrmLeadUserSummary[];
  financialProfile?: CrmLeadFinancialProfile | null;
  pipeline?: CrmLeadPipelineSummary | null;
  stage?: CrmLeadStageSummary | null;
  createdByUser?: CrmLeadUserSummary | null;
  stageHistory?: CrmLeadStageHistoryItem[];
  createdByUserId?: EntityId;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmContactLeadSummary = {
  id: EntityId;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  pipeline?: CrmLeadPipelineSummary | null;
  stage?: CrmLeadStageSummary | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmContact = {
  id: EntityId;
  nome: string;
  telefone: string | null;
  email: string | null;
  createdAt?: string;
  updatedAt?: string;
  leadsCount: number;
  leads: CrmContactLeadSummary[];
};

export type CreateCrmPipelinePayload = {
  nome: string;
  ativo: boolean;
};

export type UpdateCrmPipelinePayload = Partial<CreateCrmPipelinePayload>;

export type CreateCrmStagePayload = {
  pipelineId: EntityId;
  nome: string;
  ordem: number;
  cor: string | null;
  tipo: CrmPipelineStageType;
  slaHoras: number | null;
  ativa: boolean;
};

export type UpdateCrmStagePayload = Partial<Omit<CreateCrmStagePayload, 'pipelineId'>> & {
  pipelineId?: EntityId;
};

export type ReorderCrmStagesPayload = {
  pipelineId: EntityId;
  stages: Array<{
    id: EntityId;
    ordem: number;
  }>;
};

export type ListCrmLeadsParams = {
  pipelineId?: EntityId;
  stageId?: EntityId;
  busca?: string;
};

export type ListCrmContactsParams = {
  busca?: string;
};

export type CrmLeadFinancialProfilePayload = {
  valorEntrada?: number | null;
  fgts?: number | null;
  rendaMensal?: number | null;
  dataNascimento?: string | null;
};

export type CreateCrmLeadPayload = {
  nome: string;
  telefone: string;
  origem: string;
  email?: string | null;
  informacoesAdicionais?: string | null;
  pipelineId: EntityId;
  stageId: EntityId;
  responsaveis?: EntityId[];
  coResponsaveis?: EntityId[];
  financialProfile?: CrmLeadFinancialProfilePayload | null;
};

export type UpdateCrmLeadPayload = Partial<CreateCrmLeadPayload>;

export type UpdateCrmLeadResponsaveisPayload = {
  responsaveis?: EntityId[];
  coResponsaveis?: EntityId[];
};

export type MoveCrmLeadPayload = {
  leadId: EntityId;
  stageId: EntityId;
};

export type UpdateCrmContactPayload = {
  nome?: string;
  telefone?: string | null;
  email?: string | null;
};
