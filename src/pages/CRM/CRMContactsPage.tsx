import { AxiosError } from 'axios';
import { ArrowUpRight, Download } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { EntityId } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { LeadDetailsSheet } from '../../components/crm/leads/LeadDetailsSheet';
import { LeadEditModal, type LeadEditSubmitValues } from '../../components/crm/leads/LeadEditModal';
import { formatPhone, onlyDigits } from '../../components/crm/leads/leadUtils';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableContainer } from '../../components/ui/Table';
import { Toast } from '../../components/ui/Toast';
import {
  getCrmAssignableUsers,
  getCrmLeadById,
  getCrmLeads,
  getCrmStages,
  moveCrmLead,
  updateCrmLead,
  updateCrmLeadResponsaveis,
} from '../../services/crmService';
import type { CrmAssignableUser, CrmLead, CrmLeadStageSummary, CrmPipelineStage } from '../../types/crm';
import { toFriendlyError } from '../../utils/errorMessages';
import { exportCrmContactsXls } from '../../utils/exportCrmContactsXls';

type FeedbackToastState = {
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return dateFormatter.format(parsed);
}

function getLeadsError(error: unknown, fallback: string) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Voce nao tem permissao para visualizar os contatos do CRM.';
  }

  return toFriendlyError(error, fallback);
}

function getAssignableUsersErrorMessage(error: unknown) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Nao foi possivel carregar os usuarios disponiveis para vinculo neste lead.';
  }

  if (error instanceof AxiosError && error.response?.status === 404) {
    return 'A API de usuarios atribuiveis do CRM nao esta disponivel no backend conectado.';
  }

  return toFriendlyError(error, 'Nao foi possivel carregar os usuarios disponiveis para vinculo neste lead.');
}

function getStagesErrorMessage(error: unknown) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Nao foi possivel carregar as etapas disponiveis para este lead.';
  }

  if (error instanceof AxiosError && error.response?.status === 404) {
    return 'As etapas do pipeline deste lead nao estao disponiveis no backend conectado.';
  }

  return toFriendlyError(error, 'Nao foi possivel carregar as etapas disponiveis para este lead.');
}

function getLeadStageUpdateErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Voce nao tem permissao para alterar a coluna deste lead.';
  }

  return getLeadsError(error, fallback);
}

function getLeadStageLabel(lead: CrmLead) {
  return lead.stage?.nome ?? 'Etapa nao informada';
}

function getLeadResponsavelLabel(lead: CrmLead) {
  return lead.responsaveis[0]?.nome ?? lead.createdByUser?.nome ?? 'Definido automaticamente';
}

function parseOptionalNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
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

export function CRMContactsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const currentUserId = user?.id ?? null;

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<FeedbackToastState | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [users, setUsers] = useState<CrmAssignableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedLeadId, setSelectedLeadId] = useState<EntityId | null>(null);
  const [selectedLeadPreview, setSelectedLeadPreview] = useState<CrmLead | null>(null);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<CrmLead | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailStages, setDetailStages] = useState<CrmPipelineStage[]>([]);
  const [detailStagesLoading, setDetailStagesLoading] = useState(false);
  const [detailStagesError, setDetailStagesError] = useState<string | null>(null);
  const [detailStageUpdateError, setDetailStageUpdateError] = useState<string | null>(null);
  const [isUpdatingDetailStage, setIsUpdatingDetailStage] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLeadError, setEditLeadError] = useState<string | null>(null);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const detailsRequestRef = useRef('');
  const detailStagesRequestRef = useRef('');

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

  const filteredLeads = useMemo(() => {
    if (!normalizedSearch) {
      return leads;
    }

    const searchDigits = onlyDigits(normalizedSearch);

    return leads.filter((lead) => {
      const fields = [
        lead.nome,
        lead.email ?? '',
        lead.telefone ?? '',
        lead.origem ?? '',
        lead.pipeline?.nome ?? '',
        lead.stage?.nome ?? '',
        lead.responsaveis.map((responsavel) => responsavel.nome).join(' '),
        lead.coResponsaveis.map((responsavel) => responsavel.nome).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      const phoneDigits = onlyDigits(lead.telefone ?? '');

      return fields.includes(normalizedSearch) || (searchDigits.length > 0 && phoneDigits.includes(searchDigits));
    });
  }, [leads, normalizedSearch]);

  const selectedLead = selectedLeadDetails ?? selectedLeadPreview;
  const canEditSelectedLead = Boolean(selectedLead && canManageLeadByUser(selectedLead, isAdmin, currentUserId));

  const syncLeadState = useCallback((nextLead: CrmLead) => {
    setLeads((currentLeads) =>
      currentLeads.map((lead) => (String(lead.id) === String(nextLead.id) ? nextLead : lead)),
    );
    setSelectedLeadPreview((currentLead) =>
      currentLead && String(currentLead.id) === String(nextLead.id) ? nextLead : currentLead,
    );
    setSelectedLeadDetails((currentLead) =>
      currentLead && String(currentLead.id) === String(nextLead.id) ? nextLead : currentLead,
    );
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getCrmLeads();
      setLeads(response);
    } catch (apiError) {
      setLeads([]);
      setError(getLeadsError(apiError, 'Nao foi possivel carregar os contatos do CRM.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignableUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await getCrmAssignableUsers();
      setUsers(response);
    } catch (apiError) {
      setUsers([]);
      setUsersError(getAssignableUsersErrorMessage(apiError));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadLeadDetails = useCallback(async (leadId: EntityId) => {
    const requestKey = String(leadId);
    detailsRequestRef.current = requestKey;
    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      const details = await getCrmLeadById(leadId);

      if (detailsRequestRef.current === requestKey) {
        setSelectedLeadDetails(details);
      }
    } catch (apiError) {
      if (detailsRequestRef.current === requestKey) {
        setSelectedLeadDetails(null);
        setDetailsError(getLeadsError(apiError, 'Nao foi possivel carregar os detalhes deste lead.'));
      }
    } finally {
      if (detailsRequestRef.current === requestKey) {
        setIsLoadingDetails(false);
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
    } catch (apiError) {
      if (detailStagesRequestRef.current === requestKey) {
        setDetailStages([]);
        setDetailStagesError(getStagesErrorMessage(apiError));
      }
    } finally {
      if (detailStagesRequestRef.current === requestKey) {
        setDetailStagesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadLeads();
    void loadAssignableUsers();
  }, [loadAssignableUsers, loadLeads]);

  useEffect(() => {
    if (selectedLeadId === null || !selectedLead?.pipelineId) {
      return;
    }

    void loadDetailStages(selectedLeadId, selectedLead.pipelineId);
  }, [loadDetailStages, selectedLead?.pipelineId, selectedLeadId]);

  const handleOpenDetails = (lead: CrmLead) => {
    setSelectedLeadId(lead.id);
    setSelectedLeadPreview(lead);
    setSelectedLeadDetails(null);
    setDetailsError(null);
    setDetailStages([]);
    setDetailStagesError(null);
    setDetailStageUpdateError(null);
    void loadLeadDetails(lead.id);
  };

  const handleCloseDetails = () => {
    detailsRequestRef.current = '';
    detailStagesRequestRef.current = '';
    setSelectedLeadId(null);
    setSelectedLeadPreview(null);
    setSelectedLeadDetails(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
    setDetailStages([]);
    setDetailStagesError(null);
    setDetailStagesLoading(false);
    setDetailStageUpdateError(null);
    setEditLeadError(null);
    setIsEditModalOpen(false);
  };

  const openEditLeadModal = () => {
    if (!selectedLead) {
      return;
    }

    setEditLeadError(null);
    setIsEditModalOpen(true);

    if (!selectedLead.pipelineId || detailStagesLoading || detailStages.length > 0) {
      return;
    }

    void loadDetailStages(selectedLead.id, selectedLead.pipelineId);
  };

  const closeEditLeadModal = () => {
    if (isUpdatingLead) {
      return;
    }

    setEditLeadError(null);
    setIsEditModalOpen(false);
  };

  const executeLeadStageChange = useCallback(
    async (lead: CrmLead, targetStageId: EntityId) => {
      if (String(lead.stageId) === String(targetStageId)) {
        return lead;
      }

      let availableStages = detailStages;

      if (availableStages.length === 0) {
        availableStages = await getCrmStages(lead.pipelineId);
        setDetailStages(availableStages);
      }

      const targetStage = availableStages.find((stage) => String(stage.id) === String(targetStageId));

      if (!targetStage) {
        throw new Error('A etapa selecionada nao esta disponivel no pipeline deste lead.');
      }

      const previousLeads = leads;
      const previousSelectedLeadPreview = selectedLeadPreview;
      const previousSelectedLeadDetails = selectedLeadDetails;
      const optimisticLead = {
        ...lead,
        stageId: targetStage.id,
        stage: toLeadStageSummary(targetStage),
      };

      setLeads((currentLeads) =>
        currentLeads.map((currentLead) =>
          String(currentLead.id) === String(lead.id) ? optimisticLead : currentLead,
        ),
      );
      setSelectedLeadPreview((currentLead) =>
        currentLead && String(currentLead.id) === String(lead.id) ? optimisticLead : currentLead,
      );
      setSelectedLeadDetails((currentLead) =>
        currentLead && String(currentLead.id) === String(lead.id) ? optimisticLead : currentLead,
      );

      try {
        await moveCrmLead({
          leadId: lead.id,
          stageId: targetStageId,
        });

        const refreshedLead = await getCrmLeadById(lead.id);
        syncLeadState(refreshedLead);
        return refreshedLead;
      } catch (apiError) {
        setLeads(previousLeads);
        setSelectedLeadPreview(previousSelectedLeadPreview);
        setSelectedLeadDetails(previousSelectedLeadDetails);
        throw apiError;
      }
    },
    [detailStages, leads, selectedLeadDetails, selectedLeadPreview, syncLeadState],
  );

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
        description: refreshedLead?.stage
          ? `O lead agora esta em ${refreshedLead.stage.nome}.`
          : 'A coluna do lead foi atualizada com sucesso.',
        variant: 'success',
      });
    } catch (apiError) {
      setDetailStageUpdateError(
        getLeadStageUpdateErrorMessage(apiError, 'Nao foi possivel atualizar a coluna deste lead.'),
      );
    } finally {
      setIsUpdatingDetailStage(false);
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
      syncLeadState(refreshedLead);

      if (refreshedLead.pipelineId) {
        void loadDetailStages(refreshedLead.id, refreshedLead.pipelineId);
      }

      setFeedback({
        title: 'Lead atualizado',
        description: 'As informacoes do lead foram salvas com sucesso.',
        variant: 'success',
      });
      setIsEditModalOpen(false);
    } catch (apiError) {
      setEditLeadError(getLeadsError(apiError, 'Nao foi possivel salvar as alteracoes deste lead.'));
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const handleOpenPipelineInNewTab = () => {
    window.open('/app/crm/quadro', '_blank', 'noopener,noreferrer');
  };

  const handleExportContacts = () => {
    if (loading || error || filteredLeads.length === 0) {
      return;
    }

    setIsExporting(true);

    try {
      exportCrmContactsXls(filteredLeads, {
        searchTerm: deferredSearchTerm.trim(),
      });
      setFeedback({
        title: 'Exportacao concluida',
        description: normalizedSearch
          ? 'O arquivo XLS com os contatos filtrados foi gerado com sucesso.'
          : 'O arquivo XLS com os contatos visiveis foi gerado com sucesso.',
        variant: 'success',
      });
    } catch (exportError) {
      setFeedback({
        title: 'Nao foi possivel exportar',
        description: toFriendlyError(exportError, 'Tente novamente em instantes para gerar o arquivo XLS.'),
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="content-page">
      <PageHeader
        title="Contatos"
        subtitle="Visualize os contatos do CRM e abra o detalhe comercial completo de cada oportunidade."
        actions={
          <div className="page-header__button-group">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpRight size={16} aria-hidden="true" />}
              onClick={handleOpenPipelineInNewTab}
              aria-label="Abrir pipeline do CRM em nova aba"
              title="Abrir pipeline do CRM em nova aba"
            >
              Abrir pipeline
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="toast-stack">
          <Toast
            title={feedback.title}
            description={feedback.description}
            variant={feedback.variant}
            onClose={() => setFeedback(null)}
          />
        </div>
      ) : null}

      <Card
        title="Contatos"
        subtitle={
          !loading && !error
            ? `${filteredLeads.length} contato(s) visivel(is)${normalizedSearch ? ' com o filtro atual.' : '.'}`
            : 'Busque por nome, telefone, e-mail, origem, etapa ou responsavel para localizar contatos mais rapido.'
        }
      >
        <div className="crm-contacts-toolbar">
          <Input
            id="crm-contacts-search-list"
            label="Buscar contato"
            placeholder="Nome, telefone, e-mail, origem ou responsavel"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <div className="crm-toolbar__status">
            <span className="crm-contacts-toolbar__eyebrow">Pesquisa</span>
            <strong>{normalizedSearch ? `Filtrando por "${deferredSearchTerm.trim()}"` : 'Mostrando todos os contatos comerciais'}</strong>
          </div>

          <div className="page-header__button-group">
            <Button
              variant="secondary"
              icon={<Download size={16} aria-hidden="true" />}
              onClick={handleExportContacts}
              disabled={loading || Boolean(error) || filteredLeads.length === 0 || isExporting}
            >
              {isExporting ? 'Exportando...' : 'Exportar XLS'}
            </Button>
            <Button variant="secondary" onClick={() => void loadLeads()} disabled={loading || isExporting}>
              Atualizar
            </Button>
          </div>
        </div>

        {error ? <div className="global-error crm-leads-error-block">{error}</div> : null}

        {loading ? (
          <div className="table-skeleton">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : null}

        {!loading && !error && leads.length === 0 ? (
          <EmptyState
            title="Nenhum contato cadastrado"
            description="Assim que novas oportunidades entrarem no CRM, elas aparecerao aqui com seu detalhe comercial."
          />
        ) : null}

        {!loading && !error && leads.length > 0 && filteredLeads.length === 0 ? (
          <EmptyState
            title="Nenhum contato corresponde a busca"
            description="Tente outro nome, telefone, e-mail, origem, etapa ou responsavel para localizar um contato."
          />
        ) : null}

        {!loading && !error && filteredLeads.length > 0 ? (
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Origem</th>
                  <th>Etapa atual</th>
                  <th>Responsavel</th>
                  <th>Cadastro</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <button type="button" className="crm-contact-table__link" onClick={() => handleOpenDetails(lead)}>
                        {lead.nome}
                      </button>
                    </td>
                    <td>{formatPhone(lead.telefone)}</td>
                    <td>{lead.email || '-'}</td>
                    <td>
                      <Badge variant="info">{lead.origem || 'Sem origem'}</Badge>
                    </td>
                    <td>
                      <Badge variant="neutral">{getLeadStageLabel(lead)}</Badge>
                    </td>
                    <td>{getLeadResponsavelLabel(lead)}</td>
                    <td>{formatDate(lead.createdAt)}</td>
                    <td className="users-actions-cell">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenDetails(lead)}>
                        Ver detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        ) : null}
      </Card>

      <LeadDetailsSheet
        isOpen={selectedLeadId !== null}
        lead={selectedLead}
        isLoading={isLoadingDetails}
        error={detailsError}
        canEdit={canEditSelectedLead}
        canChangeStage={canEditSelectedLead}
        stages={detailStages}
        stagesLoading={detailStagesLoading}
        stagesError={detailStagesError}
        isUpdatingStage={isUpdatingDetailStage}
        stageUpdateError={detailStageUpdateError}
        onClose={handleCloseDetails}
        onEdit={openEditLeadModal}
        onUpdateStage={handleUpdateLeadStageFromDetails}
        onRetry={selectedLeadId !== null ? () => void loadLeadDetails(selectedLeadId) : undefined}
        onRetryStages={
          selectedLeadId !== null && selectedLead?.pipelineId
            ? () => void loadDetailStages(selectedLeadId, selectedLead.pipelineId)
            : undefined
        }
      />

      {isEditModalOpen && selectedLead ? (
        <LeadEditModal
          lead={selectedLead}
          users={users}
          stages={detailStages}
          stagesLoading={detailStagesLoading}
          stagesError={detailStagesError}
          currentUserId={String(currentUserId ?? '')}
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
