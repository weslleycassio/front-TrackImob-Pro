import type { EntityId, UserRole } from '../api/types';

export type CrmLeadAssunto = 'COMPRAR' | 'COMPRAR_PLANTA' | 'VENDER' | 'ALUGAR';

export const crmLeadAssuntoOptions: Array<{ value: CrmLeadAssunto; label: string }> = [
  { value: 'COMPRAR', label: 'Comprar' },
  { value: 'COMPRAR_PLANTA', label: 'Comprar na planta' },
  { value: 'VENDER', label: 'Vender' },
  { value: 'ALUGAR', label: 'Alugar' },
];

export const crmLeadAssuntoLabels: Record<CrmLeadAssunto, string> = {
  COMPRAR: 'Comprar',
  COMPRAR_PLANTA: 'Comprar na planta',
  VENDER: 'Vender',
  ALUGAR: 'Alugar',
};

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

export type CrmStageSetor = 'COMERCIAL' | 'DOCUMENTACAO' | 'MARKETING' | 'CONTRATO';

export const crmStageSetorOptions: Array<{ value: CrmStageSetor; label: string }> = [
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'DOCUMENTACAO', label: 'Documentacao' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'CONTRATO', label: 'Contrato' },
];

export const crmStageSetorLabels: Record<CrmStageSetor, string> = {
  COMERCIAL: 'Comercial',
  DOCUMENTACAO: 'Documentacao',
  MARKETING: 'Marketing',
  CONTRATO: 'Contrato',
};

export type CrmStageRole = 'ADMIN' | 'CORRETOR' | 'DOCUMENTISTA' | 'MARKETING' | 'CONTRATO';

export const crmStageRoleOptions: Array<{ value: CrmStageRole; label: string }> = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'CORRETOR', label: 'Corretor' },
  { value: 'DOCUMENTISTA', label: 'Documentista' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'CONTRATO', label: 'Contrato' },
];

export const crmStageRoleLabels: Record<CrmStageRole, string> = {
  ADMIN: 'Administrador',
  CORRETOR: 'Corretor',
  DOCUMENTISTA: 'Documentista',
  MARKETING: 'Marketing',
  CONTRATO: 'Contrato',
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
  setor: CrmStageSetor | null;
  rolesPermitidas: CrmStageRole[];
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
  setor: CrmStageSetor | null;
  rolesPermitidas: CrmStageRole[];
  ativa: boolean;
};

export type CrmLeadStageHistoryItem = {
  id: EntityId;
  leadId: EntityId;
  fromStageId: EntityId | null;
  toStageId: EntityId;
  movedByUserId: EntityId | null;
  enteredAt?: string;
  exitedAt?: string | null;
  durationMs?: number | null;
  isCurrent?: boolean;
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
  assunto: CrmLeadAssunto | null;
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
  enteredCurrentStageAt?: string | null;
  currentStageDurationMs?: number | null;
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
  assunto: CrmLeadAssunto | null;
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
  setor: CrmStageSetor;
  rolesPermitidas?: CrmStageRole[];
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
  assunto: CrmLeadAssunto;
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
