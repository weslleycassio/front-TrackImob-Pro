import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import type { EntityId } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { setDocumentTitle } from '../../config/app';
import { LeadKanbanBoard } from '../../components/crm/LeadKanbanBoard';
import { LeadFormModal, type LeadFormValues } from '../../components/crm/LeadFormModal';
import { LeadDetailsSheet } from '../../components/crm/leads/LeadDetailsSheet';
import { LeadEditModal, type LeadEditSubmitValues } from '../../components/crm/leads/LeadEditModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';
import {
  createCrmLead,
  getActiveCrmPipelineDetails,
  getCrmAssignableUsers,
  getCrmLeadById,
  getCrmLeads,
  getCrmStages,
  moveCrmLead,
  updateCrmLead,
  updateCrmLeadResponsaveis,
} from '../../services/crmService';
import type { CrmAssignableUser, CrmLead, CrmLeadStageSummary, CrmPipelineDetails, CrmPipelineStage } from '../../types/crm';
import { toFriendlyError } from '../../utils/errorMessages';

type FeedbackToastState = {
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

function getLeadErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'A API de leads do CRM ainda nao esta disponivel no backend conectado.';
  }

  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Voce nao tem permissao para acessar estes leads.';
  }

  return toFriendlyError(error, fallback);
}

function getAssignableUsersErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'Nao foi possivel carregar os usuarios disponiveis para vinculo neste lead.';
  }

  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'A API de usuarios atribuiveis do CRM nao esta disponivel no backend conectado.';
  }

  return toFriendlyError(error, 'Nao foi possivel carregar os usuarios disponiveis para vinculo neste lead.');
}

function getStagesErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'Nao foi possivel carregar as etapas disponiveis para este lead.';
  }

  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'As etapas do pipeline deste lead nao estao disponiveis no backend conectado.';
  }

  return toFriendlyError(error, 'Nao foi possivel carregar as etapas disponiveis para este lead.');
}

function getLeadStageUpdateErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'Voce nao tem permissao para alterar a coluna deste lead.';
  }

  return getLeadErrorMessage(error, fallback);
}

function parseOptionalNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getEntryStage(pipeline: CrmPipelineDetails | null) {
  if (!pipeline) {
    return null;
  }

  const enabledStages = pipeline.stages.filter((stage) => stage.ativa);
  const availableStages = enabledStages.length > 0 ? enabledStages : pipeline.stages;
  const orderedStages = [...availableStages].sort((left, right) => left.ordem - right.ordem);

  return orderedStages[0] ?? null;
}

function getBoardStages(pipeline: CrmPipelineDetails | null) {
  if (!pipeline) {
    return [];
  }

  const enabledStages = pipeline.stages.filter((stage) => stage.ativa);
  const availableStages = enabledStages.length > 0 ? enabledStages : pipeline.stages;

  return [...availableStages].sort((left, right) => left.ordem - right.ordem);
}

function toLeadStageSummary(stage: CrmPipelineStage): CrmLeadStageSummary {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    nome: stage.nome,
    ordem: stage.ordem,
    cor: stage.cor,
    tipo: stage.tipo,
    ativa: stage.ativa,
  };
}

function canManageLeadByUser(lead: CrmLead, isAdmin: boolean, currentUserId: EntityId | null | undefined) {
  if (isAdmin) {
    return true;
  }

  if (currentUserId === null || currentUserId === undefined) {
    return false;
  }

  const normalizedCurrentUserId = String(currentUserId);

  return [...lead.responsaveis, ...lead.coResponsaveis].some((user) => String(user.id) === normalizedCurrentUserId);
}

type CRMPageProps = {
  boardOnly?: boolean;
};

export function CRMPage({ boardOnly = false }: CRMPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const currentUserId = user?.id ?? null;

  const [activePipeline, setActivePipeline] = useState<CrmPipelineDetails | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [users, setUsers] = useState<CrmAssignableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [origemFilter, setOrigemFilter] = useState('');
  const [responsavelFilter, setResponsavelFilter] = useState('');

  const [feedback, setFeedback] = useState<FeedbackToastState | null>(null);

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadModalError, setLeadModalError] = useState<string | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLeadError, setEditLeadError] = useState<string | null>(null);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const [editStages, setEditStages] = useState<CrmPipelineStage[]>([]);
  const [editStagesLoading, setEditStagesLoading] = useState(false);
  const [editStagesError, setEditStagesError] = useState<string | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<EntityId | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<EntityId | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailStages, setDetailStages] = useState<CrmPipelineStage[]>([]);
  const [detailStagesLoading, setDetailStagesLoading] = useState(false);
  const [detailStagesError, setDetailStagesError] = useState<string | null>(null);
  const [detailStageUpdateError, setDetailStageUpdateError] = useState<string | null>(null);
  const [isUpdatingDetailStage, setIsUpdatingDetailStage] = useState(false);
  const detailRequestRef = useRef('');
  const detailStagesRequestRef = useRef('');

  const assignableUsers = useMemo(() => users, [users]);

  const entryStage = useMemo<CrmPipelineStage | null>(() => getEntryStage(activePipeline), [activePipeline]);
  const boardStages = useMemo(() => getBoardStages(activePipeline), [activePipeline]);

  const pipelineLeads = useMemo(() => {
    if (!activePipeline) {
      return [];
    }

    return leads.filter((lead) => String(lead.pipelineId) === String(activePipeline.id));
  }, [activePipeline, leads]);

  const origemOptions = useMemo(() => {
    return [...new Set(pipelineLeads.map((lead) => lead.origem?.trim()).filter((origem): origem is string => Boolean(origem)))].sort((left, right) =>
      left.localeCompare(right, 'pt-BR'),
    );
  }, [pipelineLeads]);

  const responsavelOptions = useMemo(() => {
    const owners = new Map<string, string>();

    pipelineLeads.forEach((lead) => {
      lead.responsaveis.forEach((responsavel) => {
        const responsavelId = String(responsavel.id);
        if (!owners.has(responsavelId)) {
          owners.set(responsavelId, responsavel.nome);
        }
      });
    });

    return [...owners.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
  }, [pipelineLeads]);

  const filteredLeads = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return pipelineLeads.filter((lead) => {
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        [lead.nome, lead.telefone ?? '', lead.origem ?? '', lead.email ?? '', lead.informacoesAdicionais ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearchTerm);
      const matchesOrigem = origemFilter.length === 0 || (lead.origem ?? '') === origemFilter;
      const matchesResponsavel =
        responsavelFilter.length === 0 || lead.responsaveis.some((responsavel) => String(responsavel.id) === responsavelFilter);

      return matchesSearch && matchesOrigem && matchesResponsavel;
    });
  }, [origemFilter, pipelineLeads, responsavelFilter, searchTerm]);

  const hasActiveFilters = searchTerm.length > 0 || origemFilter.length > 0 || responsavelFilter.length > 0;

  const totalVisibleOwners = useMemo(() => {
    const uniqueIds = new Set<string>();

    pipelineLeads.forEach((lead) => {
      lead.responsaveis.forEach((responsavel) => uniqueIds.add(String(responsavel.id)));
      lead.coResponsaveis.forEach((responsavel) => uniqueIds.add(String(responsavel.id)));
    });

    return uniqueIds.size;
  }, [pipelineLeads]);

  const canManageLead = useCallback(
    (lead: CrmLead) => canManageLeadByUser(lead, isAdmin, currentUserId),
    [currentUserId, isAdmin],
  );

  const loadPipelineContext = useCallback(async () => {
    setPipelineLoading(true);
    setPipelineError(null);

    try {
      const pipeline = await getActiveCrmPipelineDetails();
      setActivePipeline(pipeline);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setActivePipeline(null);
        setPipelineError(null);
      } else {
        setActivePipeline(null);
        setPipelineError(toFriendlyError(error, 'Nao foi possivel carregar o pipeline ativo do CRM.'));
      }
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  const loadAssignableUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const loadedUsers = await getCrmAssignableUsers();
      setUsers(loadedUsers);
    } catch (error) {
      setUsers([]);
      setUsersError(getAssignableUsersErrorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError(null);

    try {
      const loadedLeads = await getCrmLeads();
      setLeads(loadedLeads);
    } catch (error) {
      setLeads([]);
      setLeadsError(getLeadErrorMessage(error, 'Nao foi possivel carregar os leads do CRM.'));
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const loadLeadDetail = useCallback(async (leadId: EntityId) => {
    const requestKey = String(leadId);
    detailRequestRef.current = requestKey;
    setDetailLoading(true);
    setDetailError(null);

    try {
      const lead = await getCrmLeadById(leadId);

      if (detailRequestRef.current === requestKey) {
        setSelectedLead(lead);
      }
    } catch (error) {
      if (detailRequestRef.current === requestKey) {
        setSelectedLead(null);
        setDetailError(getLeadErrorMessage(error, 'Nao foi possivel carregar os detalhes deste lead.'));
      }
    } finally {
      if (detailRequestRef.current === requestKey) {
        setDetailLoading(false);
      }
    }
  }, []);

  const loadDetailStages = useCallback(async (leadId: EntityId, pipelineId: EntityId) => {
    const requestKey = `${String(leadId)}:${String(pipelineId)}`;
    detailStagesRequestRef.current = requestKey;
    setDetailStagesLoading(true);
    setDetailStagesError(null);

    try {
      const stages = await getCrmStages(pipelineId);

      if (detailStagesRequestRef.current === requestKey) {
        setDetailStages(stages);
      }
    } catch (error) {
      if (detailStagesRequestRef.current === requestKey) {
        setDetailStages([]);
        setDetailStagesError(getStagesErrorMessage(error));
      }
    } finally {
      if (detailStagesRequestRef.current === requestKey) {
        setDetailStagesLoading(false);
      }
    }
  }, []);

  const loadEditStages = useCallback(async (pipelineId: EntityId) => {
    setEditStagesLoading(true);
    setEditStagesError(null);

    try {
      const stages = await getCrmStages(pipelineId);
      setEditStages(stages);
    } catch (error) {
      setEditStages([]);
      setEditStagesError(getStagesErrorMessage(error));
    } finally {
      setEditStagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPipelineContext();

    if (!boardOnly) {
      void loadAssignableUsers();
    }
  }, [boardOnly, loadAssignableUsers, loadPipelineContext]);

  useEffect(() => {
    if (!boardOnly) {
      return;
    }

    setDocumentTitle('Quadro do CRM');
  }, [boardOnly]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (boardOnly || !isDetailOpen || selectedLeadId === null || !selectedLead?.pipelineId) {
      return;
    }

    void loadDetailStages(selectedLeadId, selectedLead.pipelineId);
  }, [boardOnly, isDetailOpen, loadDetailStages, selectedLead?.pipelineId, selectedLeadId]);

  const openLeadModal = () => {
    setLeadModalError(null);
    setIsLeadModalOpen(true);
  };

  const closeLeadModal = () => {
    if (isCreatingLead) {
      return;
    }

    setLeadModalError(null);
    setIsLeadModalOpen(false);
  };

  const handleSelectLead = (lead: CrmLead) => {
    setSelectedLeadId(lead.id);
    setSelectedLead(lead);
    setDetailError(null);
    setDetailStageUpdateError(null);
    setDetailStages([]);
    setDetailStagesError(null);
    setIsDetailOpen(true);
    void loadLeadDetail(lead.id);
  };

  const closeLeadDetail = () => {
    detailRequestRef.current = '';
    detailStagesRequestRef.current = '';
    setDetailLoading(false);
    setDetailStagesLoading(false);
    setDetailError(null);
    setDetailStagesError(null);
    setDetailStageUpdateError(null);
    setIsDetailOpen(false);
  };

  const openEditLeadModal = () => {
    if (!selectedLead) {
      return;
    }

    setEditLeadError(null);
    setEditStages([]);
    setEditStagesError(null);
    setIsEditModalOpen(true);
    void loadEditStages(selectedLead.pipelineId);
  };

  const closeEditLeadModal = () => {
    if (isUpdatingLead) {
      return;
    }

    setEditLeadError(null);
    setEditStages([]);
    setEditStagesError(null);
    setIsEditModalOpen(false);
  };

  const handleCreateLead = async (values: LeadFormValues) => {
    if (!user || !activePipeline || !entryStage) {
      setLeadModalError('Ative um pipeline com etapa inicial para cadastrar leads.');
      return;
    }

    setIsCreatingLead(true);
    setLeadModalError(null);

    const financialProfile = {
      valorEntrada: parseOptionalNumber(values.entrada) ?? null,
      fgts: parseOptionalNumber(values.fgts) ?? null,
      rendaMensal: parseOptionalNumber(values.renda) ?? null,
      dataNascimento: values.dataNascimento?.trim() ? values.dataNascimento : null,
    };
    const hasFinancialProfile = Object.values(financialProfile).some((value) => value !== null);

    try {
      const createdLead = await createCrmLead({
        nome: values.nome.trim(),
        telefone: values.telefone.replace(/\D/g, ''),
        origem: values.origem.trim(),
        email: values.email?.trim() || null,
        informacoesAdicionais: values.informacoesAdicionais?.trim() || null,
        pipelineId: values.pipelineId || String(activePipeline.id),
        stageId: values.stageId || String(entryStage.id),
        responsaveis: isAdmin && values.responsavelId ? [values.responsavelId] : undefined,
        coResponsaveis: values.coResponsaveis.length > 0 ? values.coResponsaveis : undefined,
        financialProfile: hasFinancialProfile ? financialProfile : undefined,
      });

      setFeedback({
        title: 'Lead criado',
        description: 'O lead foi cadastrado com sucesso e ja esta disponivel na listagem.',
        variant: 'success',
      });
      setIsLeadModalOpen(false);
      setSearchInput('');
      setSearchTerm('');
      setOrigemFilter('');
      setResponsavelFilter('');
      await loadLeads();
      handleSelectLead(createdLead);
    } catch (error) {
      setLeadModalError(getLeadErrorMessage(error, 'Nao foi possivel criar este lead.'));
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleUpdateLead = async ({ values, assignmentsChanged }: LeadEditSubmitValues) => {
    if (!selectedLead) {
      return;
    }

    setIsUpdatingLead(true);
    setEditLeadError(null);

    const nextFinancialProfile = {
      valorEntrada: parseOptionalNumber(values.entrada) ?? null,
      fgts: parseOptionalNumber(values.fgts) ?? null,
      rendaMensal: parseOptionalNumber(values.renda) ?? null,
      dataNascimento: values.dataNascimento?.trim() ? values.dataNascimento : null,
    };
    const hadFinancialProfile =
      selectedLead.entrada !== null ||
      selectedLead.fgts !== null ||
      selectedLead.renda !== null ||
      selectedLead.dataNascimento !== null;
    const hasFinancialProfile = Object.values(nextFinancialProfile).some((value) => value !== null);

    try {
      await updateCrmLead(selectedLead.id, {
        nome: values.nome.trim(),
        telefone: values.telefone.replace(/\D/g, ''),
        email: values.email?.trim() || null,
        origem: values.origem.trim(),
        financialProfile: hadFinancialProfile || hasFinancialProfile ? nextFinancialProfile : undefined,
      });

      if (String(values.stageId) !== String(selectedLead.stageId)) {
        await moveCrmLead({
          leadId: selectedLead.id,
          stageId: values.stageId,
        });
      }

      if (isAdmin && assignmentsChanged && values.responsavelId) {
        await updateCrmLeadResponsaveis(selectedLead.id, {
          responsaveis: [values.responsavelId],
          coResponsaveis: values.coResponsaveis,
        });
      }

      const refreshedLead = await getCrmLeadById(selectedLead.id);
      setSelectedLead(refreshedLead);
      await loadLeads();
      setFeedback({
        title: 'Lead atualizado',
        description: 'As informacoes do lead foram salvas com sucesso.',
        variant: 'success',
      });
      setIsEditModalOpen(false);
    } catch (error) {
      setEditLeadError(getLeadErrorMessage(error, 'Nao foi possivel salvar as alteracoes deste lead.'));
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const executeLeadStageChange = useCallback(async (lead: CrmLead, targetStageId: EntityId) => {
    if (!activePipeline || String(lead.stageId) === String(targetStageId)) {
      return null;
    }

    const availableStages = detailStages.length > 0 ? detailStages : boardStages;
    const targetStage = availableStages.find((stage) => String(stage.id) === String(targetStageId));

    if (!targetStage) {
      throw new Error('A etapa selecionada nao esta disponivel no pipeline deste lead.');
    }

    const previousLeads = leads;
    const previousSelectedLead = selectedLead;
    const optimisticLead = {
      ...lead,
      stageId: targetStage.id,
      stage: toLeadStageSummary(targetStage),
    };

    setMovingLeadId(lead.id);
    setLeads((currentLeads) =>
      currentLeads.map((currentLead) => (String(currentLead.id) === String(lead.id) ? optimisticLead : currentLead)),
    );
    setSelectedLead((currentLead) =>
      currentLead && String(currentLead.id) === String(lead.id) ? { ...currentLead, ...optimisticLead } : currentLead,
    );

    try {
      await moveCrmLead({
        leadId: lead.id,
        stageId: targetStageId,
      });

      const refreshedLead = await getCrmLeadById(lead.id);
      setLeads((currentLeads) =>
        currentLeads.map((currentLead) => (String(currentLead.id) === String(lead.id) ? refreshedLead : currentLead)),
      );
      setSelectedLead((currentLead) =>
        currentLead && String(currentLead.id) === String(lead.id) ? refreshedLead : currentLead,
      );
      return refreshedLead;
    } catch (error) {
      setLeads(previousLeads);
      setSelectedLead(previousSelectedLead);
      throw error;
    } finally {
      setMovingLeadId(null);
    }
  }, [activePipeline, boardStages, detailStages, leads, selectedLead]);

  const handleMoveLead = async (lead: CrmLead, targetStageId: EntityId) => {
    try {
      const refreshedLead = await executeLeadStageChange(lead, targetStageId);

      if (!refreshedLead?.stage) {
        return;
      }

      setFeedback({
        title: 'Lead movido',
        description: `O lead foi atualizado para ${refreshedLead.stage.nome}.`,
        variant: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'Nao foi possivel mover o lead',
        description: getLeadStageUpdateErrorMessage(error, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    }
  };

  const handleUpdateLeadStageFromDetails = async (targetStageId: EntityId) => {
    if (!selectedLead) {
      return;
    }

    setIsUpdatingDetailStage(true);
    setDetailStageUpdateError(null);

    try {
      const refreshedLead = await executeLeadStageChange(selectedLead, targetStageId);

      if (refreshedLead?.pipelineId) {
        void loadDetailStages(refreshedLead.id, refreshedLead.pipelineId);
      }

      setFeedback({
        title: 'Coluna atualizada',
        description: refreshedLead?.stage ? `O lead agora esta em ${refreshedLead.stage.nome}.` : 'A coluna do lead foi atualizada com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      setDetailStageUpdateError(getLeadStageUpdateErrorMessage(error, 'Nao foi possivel atualizar a coluna deste lead.'));
    } finally {
      setIsUpdatingDetailStage(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setOrigemFilter('');
    setResponsavelFilter('');
  };

  const canEditSelectedLead = Boolean(selectedLead && canManageLead(selectedLead));
  const handleOpenPipelineInNewTab = () => {
    window.open('/app/crm/quadro', '_blank', 'noopener,noreferrer');
  };
  const handleCloseBoardView = () => {
    try {
      window.close();
    } finally {
      window.setTimeout(() => {
        navigate('/app/crm', { replace: true });
      }, 120);
    }
  };

  if (boardOnly) {
    return (
      <main className="crm-board-view">
        <div className="crm-board-view__actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<X size={16} aria-hidden="true" />}
            onClick={handleCloseBoardView}
            aria-label="Fechar quadro"
            title="Fechar quadro"
            className="crm-board-view__close"
          >
            Fechar
          </Button>
        </div>

        {feedback ? (
          <div className="toast-stack">
            <Toast title={feedback.title} description={feedback.description} variant={feedback.variant} onClose={() => setFeedback(null)} />
          </div>
        ) : null}

        <section className="crm-board-view__canvas">
          {pipelineLoading || leadsLoading ? (
            <div className="crm-leads-list-skeleton">
              <Skeleton height={180} />
              <Skeleton height={180} />
              <Skeleton height={180} />
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && pipelineError ? (
            <div className="crm-board-view__feedback">
              <div className="global-error">{pipelineError}</div>
              <Button variant="secondary" onClick={() => void loadPipelineContext()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && leadsError ? (
            <div className="crm-board-view__feedback">
              <div className="global-error">{leadsError}</div>
              <Button variant="secondary" onClick={() => void loadLeads()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && !activePipeline ? (
            <div className="crm-board-view__feedback">
              <EmptyState
                title="Nenhum pipeline ativo"
                description={
                  isAdmin
                    ? 'Configure um pipeline ativo com etapas para liberar o quadro do CRM.'
                    : 'Aguarde a configuracao de um pipeline ativo para visualizar o quadro comercial.'
                }
              />
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && activePipeline && boardStages.length === 0 ? (
            <div className="crm-board-view__feedback">
              <EmptyState
                title="Nenhuma etapa disponivel"
                description={
                  isAdmin
                    ? 'O pipeline ativo ainda nao possui etapas habilitadas para exibir o quadro.'
                    : 'O pipeline ativo ainda nao possui etapas visiveis para o quadro.'
                }
              />
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && !leadsError && activePipeline && boardStages.length > 0 && pipelineLeads.length === 0 ? (
            <div className="crm-board-view__feedback">
              <EmptyState
                title="Nenhum lead no pipeline ativo"
                description="Quando existirem oportunidades neste pipeline, elas aparecerao aqui para movimentacao no quadro."
              />
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && !leadsError && activePipeline && boardStages.length > 0 && pipelineLeads.length > 0 ? (
            <LeadKanbanBoard
              stages={boardStages}
              leads={pipelineLeads}
              movingLeadId={movingLeadId}
              onMoveLead={handleMoveLead}
              canMoveLead={canManageLead}
            />
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="content-page">
      <PageHeader
        title="CRM"
        subtitle={
          isAdmin
            ? 'Acompanhe o pipeline ativo da imobiliaria, mova oportunidades entre etapas e mantenha a operacao comercial organizada.'
            : 'Acompanhe em Kanban os leads em que voce atua e mova as oportunidades conforme o andamento comercial.'
        }
        actions={
          <div className="page-header__button-group">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpRight size={16} aria-hidden="true" />}
              onClick={handleOpenPipelineInNewTab}
              aria-label="Abrir quadro do CRM em nova aba"
              title="Abrir quadro do CRM em nova aba"
            >
              Abrir em nova aba
            </Button>
            {isAdmin ? (
              <Link to="/app/crm/config">
                <Button variant="secondary">Configurar pipeline</Button>
              </Link>
            ) : null}
            <Button onClick={openLeadModal} disabled={!activePipeline || !entryStage}>
              Novo lead
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="toast-stack">
          <Toast title={feedback.title} description={feedback.description} variant={feedback.variant} onClose={() => setFeedback(null)} />
        </div>
      ) : null}

      <section className="crm-leads-shell">
        <div className="crm-leads-metrics">
          <Card className="crm-leads-metric-card">
            {pipelineLoading || leadsLoading ? (
              <>
                <Skeleton height={18} />
                <Skeleton height={42} />
              </>
            ) : (
              <>
                <span className="crm-leads-metric-card__label">Leads no pipeline ativo</span>
                <strong className="crm-leads-metric-card__value">{pipelineLeads.length}</strong>
                <p className="crm-leads-metric-card__note">
                  {pipelineLeads.length === 1
                    ? '1 lead visivel dentro do pipeline atual.'
                    : `${pipelineLeads.length} leads retornados para o Kanban.`}
                </p>
              </>
            )}
          </Card>

          <Card className="crm-leads-metric-card">
            {pipelineLoading ? (
              <>
                <Skeleton height={18} />
                <Skeleton height={42} />
              </>
            ) : (
              <>
                <span className="crm-leads-metric-card__label">Pipeline ativo</span>
                <strong className="crm-leads-metric-card__value crm-leads-metric-card__value--sm">
                  {activePipeline?.nome ?? 'Nao configurado'}
                </strong>
                <p className="crm-leads-metric-card__note">
                  {boardStages.length > 0
                    ? `${boardStages.length} etapa(s) disponiveis no quadro.`
                    : isAdmin
                      ? 'Ative etapas no pipeline para liberar o Kanban.'
                      : 'Aguarde a configuracao do pipeline ativo para visualizar o quadro.'}
                </p>
              </>
            )}
          </Card>

          <Card className="crm-leads-metric-card">
            {pipelineLoading || leadsLoading ? (
              <>
                <Skeleton height={18} />
                <Skeleton height={42} />
              </>
            ) : (
              <>
                <span className="crm-leads-metric-card__label">Pessoas envolvidas</span>
                <strong className="crm-leads-metric-card__value">{totalVisibleOwners}</strong>
                <p className="crm-leads-metric-card__note">Responsaveis e co-responsaveis somados no pipeline atual.</p>
              </>
            )}
          </Card>
        </div>

        <Card
          title="Kanban do CRM"
          subtitle="Filtre a base visivel, mova leads entre etapas e abra o detalhe do card para editar quando precisar."
          actions={
            hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : null
          }
        >
          <div className={['crm-toolbar', 'crm-toolbar--kanban', isAdmin ? 'crm-toolbar--kanban-admin' : ''].filter(Boolean).join(' ')}>
            <Input
              id="crm-leads-search"
              label="Buscar lead"
              placeholder="Nome, telefone, origem ou observacao"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Select id="crm-leads-origem-filter" label="Origem" value={origemFilter} onChange={(event) => setOrigemFilter(event.target.value)}>
              <option value="">Todas as origens</option>
              {origemOptions.map((origem) => (
                <option key={`crm-origem-filter-${origem}`} value={origem}>
                  {origem}
                </option>
              ))}
            </Select>
            {isAdmin ? (
              <Select
                id="crm-leads-responsavel-filter"
                label="Responsavel"
                value={responsavelFilter}
                onChange={(event) => setResponsavelFilter(event.target.value)}
              >
                <option value="">Todos os responsaveis</option>
                {responsavelOptions.map((responsavel) => (
                  <option key={`crm-responsavel-filter-${responsavel.id}`} value={responsavel.id}>
                    {responsavel.nome}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>

          <div className="crm-toolbar__status">
            <Badge variant={activePipeline && entryStage ? 'success' : 'warning'}>
              {activePipeline && entryStage ? 'Cadastro rapido habilitado' : 'Cadastro bloqueado sem pipeline ativo'}
            </Badge>
            {activePipeline?.updatedAt ? (
              <span className="ui-field__hint">Pipeline atualizado em {dateFormatter.format(new Date(activePipeline.updatedAt))}</span>
            ) : null}
            {hasActiveFilters ? (
              <span className="ui-field__hint">
                {filteredLeads.length === 1 ? '1 lead visivel apos os filtros.' : `${filteredLeads.length} leads visiveis apos os filtros.`}
              </span>
            ) : null}
            {usersLoading ? <span className="ui-field__hint">Carregando equipe para distribuicao...</span> : null}
            {usersError ? <span className="ui-field__hint">{usersError}</span> : null}
          </div>
        </Card>

        {pipelineError ? (
          <Card
            title="Nao foi possivel carregar o contexto do CRM"
            subtitle="A listagem de leads continua disponivel, mas o cadastro depende do pipeline ativo."
            actions={
              <Button variant="secondary" onClick={() => void loadPipelineContext()}>
                Tentar novamente
              </Button>
            }
          >
            <div className="global-error">{pipelineError}</div>
          </Card>
        ) : null}

        <Card
          className="crm-leads-list-card"
          title="Quadro do pipeline"
          subtitle={activePipeline ? `Etapas ativas do pipeline ${activePipeline.nome}.` : 'Configure um pipeline para acompanhar o CRM em Kanban.'}
        >
          {pipelineLoading || leadsLoading ? (
            <div className="crm-leads-list-skeleton">
              <Skeleton height={180} />
              <Skeleton height={180} />
              <Skeleton height={180} />
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && leadsError ? (
            <div className="crm-leads-feedback">
              <div className="global-error">{leadsError}</div>
              <Button variant="secondary" onClick={() => void loadLeads()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && !activePipeline ? (
            <EmptyState
              title="Nenhum pipeline ativo"
              description={
                isAdmin
                  ? 'Configure um pipeline ativo com etapas para liberar o Kanban do CRM para a imobiliaria.'
                  : 'Aguarde a configuracao de um pipeline ativo para visualizar o quadro comercial.'
              }
              action={
                isAdmin ? (
                  <Link to="/app/crm/config">
                    <Button size="sm">Configurar CRM</Button>
                  </Link>
                ) : null
              }
            />
          ) : null}

          {!pipelineLoading && !leadsLoading && !pipelineError && activePipeline && boardStages.length === 0 ? (
            <EmptyState
              title="Nenhuma etapa disponivel"
              description={
                isAdmin
                  ? 'O pipeline ativo ainda nao possui etapas habilitadas para exibir o Kanban.'
                  : 'O pipeline ativo ainda nao possui etapas visiveis para o Kanban.'
              }
              action={
                isAdmin ? (
                  <Link to="/app/crm/config">
                    <Button size="sm">Gerenciar etapas</Button>
                  </Link>
                ) : null
              }
            />
          ) : null}

          {!pipelineLoading && !leadsLoading && !leadsError && activePipeline && boardStages.length > 0 && filteredLeads.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'Nenhum lead corresponde aos filtros' : 'Nenhum lead no pipeline ativo'}
              description={
                hasActiveFilters
                  ? 'Ajuste a busca ou os filtros para encontrar outros leads dentro do Kanban.'
                  : activePipeline && entryStage
                    ? 'Cadastre o primeiro lead para preencher o quadro do CRM.'
                    : 'Ainda nao existem leads visiveis neste pipeline.'
              }
              action={
                activePipeline && entryStage ? (
                  <Button size="sm" onClick={openLeadModal}>
                    Novo lead
                  </Button>
                ) : null
              }
            />
          ) : null}

          {!pipelineLoading && !leadsLoading && !leadsError && activePipeline && boardStages.length > 0 && filteredLeads.length > 0 ? (
            <LeadKanbanBoard
              stages={boardStages}
              leads={filteredLeads}
              movingLeadId={movingLeadId}
              selectedLeadId={selectedLeadId}
              onMoveLead={handleMoveLead}
              onSelectLead={handleSelectLead}
              canMoveLead={canManageLead}
            />
          ) : null}
        </Card>
      </section>

      {isLeadModalOpen ? (
        <LeadFormModal
          pipeline={activePipeline}
          stage={entryStage}
          users={assignableUsers}
          currentUserId={user?.id ?? null}
          canSelectResponsavel={isAdmin}
          usersLoading={usersLoading}
          usersError={usersError}
          isSubmitting={isCreatingLead}
          error={leadModalError}
          onClose={closeLeadModal}
          onSubmit={handleCreateLead}
        />
      ) : null}

      <LeadDetailsSheet
        isOpen={isDetailOpen}
        lead={selectedLead}
        isLoading={detailLoading}
        error={detailError}
        canEdit={canEditSelectedLead}
        canChangeStage={canEditSelectedLead}
        stages={detailStages}
        stagesLoading={detailStagesLoading}
        stagesError={detailStagesError}
        isUpdatingStage={isUpdatingDetailStage}
        stageUpdateError={detailStageUpdateError}
        onClose={closeLeadDetail}
        onEdit={openEditLeadModal}
        onUpdateStage={handleUpdateLeadStageFromDetails}
        onRetry={selectedLeadId !== null ? () => void loadLeadDetail(selectedLeadId) : undefined}
        onRetryStages={
          selectedLeadId !== null && selectedLead?.pipelineId
            ? () => void loadDetailStages(selectedLeadId, selectedLead.pipelineId)
            : undefined
        }
      />

      {isEditModalOpen && selectedLead ? (
        <LeadEditModal
          lead={selectedLead}
          users={assignableUsers}
          stages={editStages}
          stagesLoading={editStagesLoading}
          stagesError={editStagesError}
          currentUserId={String(user?.id ?? '')}
          isAdmin={isAdmin}
          usersLoading={usersLoading}
          usersError={usersError}
          isSubmitting={isUpdatingLead}
          error={editLeadError}
          onClose={closeEditLeadModal}
          onSubmit={handleUpdateLead}
        />
      ) : null}
    </main>
  );
}
