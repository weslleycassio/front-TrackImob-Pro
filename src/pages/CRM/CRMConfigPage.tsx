import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { PipelineFormModal } from '../../components/crm/PipelineFormModal';
import { StageConfigBoard } from '../../components/crm/StageConfigBoard';
import { StageDeleteModal } from '../../components/crm/StageDeleteModal';
import { StageFormModal } from '../../components/crm/StageFormModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';
import {
  createCrmPipeline,
  createCrmStage,
  deleteCrmStage,
  getActiveCrmPipeline,
  getCrmPipelines,
  getCrmStages,
  reorderCrmStages,
  updateCrmPipeline,
  updateCrmStage,
} from '../../services/crmService';
import type { CrmPipeline, CrmPipelineStage, CrmPipelineStageType, CrmStageRole, CrmStageSetor } from '../../types/crm';
import { toFriendlyError } from '../../utils/errorMessages';

type FeedbackToastState = {
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
};

type PipelineModalState =
  | {
      mode: 'create';
      pipeline?: null;
    }
  | {
      mode: 'edit';
      pipeline: CrmPipeline;
    };

type StageModalState =
  | {
      mode: 'create';
      stage?: null;
    }
  | {
      mode: 'edit';
      stage: CrmPipelineStage;
    };

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function sortPipelines(pipelines: CrmPipeline[]) {
  return [...pipelines].sort((left, right) => {
    if (left.ativo !== right.ativo) {
      return left.ativo ? -1 : 1;
    }

    return left.nome.localeCompare(right.nome, 'pt-BR');
  });
}

function mergeActivePipeline(pipelines: CrmPipeline[], activePipeline: CrmPipeline | null) {
  if (!activePipeline) {
    return sortPipelines(pipelines);
  }

  const hasActivePipeline = pipelines.some((pipeline) => String(pipeline.id) === String(activePipeline.id));
  const mergedPipelines = hasActivePipeline
    ? pipelines.map((pipeline) => ({
        ...pipeline,
        ativo: String(pipeline.id) === String(activePipeline.id),
      }))
    : [...pipelines, { ...activePipeline, ativo: true }];

  return sortPipelines(mergedPipelines);
}

function reorderStagesLocally(stages: CrmPipelineStage[], stageId: string | number, direction: 'up' | 'down') {
  const currentIndex = stages.findIndex((stage) => String(stage.id) === String(stageId));

  if (currentIndex < 0) {
    return stages;
  }

  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex < 0 || nextIndex >= stages.length) {
    return stages;
  }

  const reorderedStages = [...stages];
  const currentStage = reorderedStages[currentIndex];
  reorderedStages[currentIndex] = reorderedStages[nextIndex];
  reorderedStages[nextIndex] = currentStage;

  return reorderedStages.map((stage, index) => ({
    ...stage,
    ordem: index + 1,
  }));
}

function sortStagesByOrder(stages: CrmPipelineStage[]) {
  return [...stages].sort((left, right) => left.ordem - right.ordem);
}

function mergeReorderedStages(currentStages: CrmPipelineStage[], reorderedStages: CrmPipelineStage[]) {
  const reorderedStagesMap = new Map(reorderedStages.map((stage) => [String(stage.id), stage]));

  return currentStages.map((stage) => reorderedStagesMap.get(String(stage.id)) ?? stage);
}

function getVisibleStageOrder(stage: CrmPipelineStage, activeStages: CrmPipelineStage[]) {
  const visibleIndex = activeStages.findIndex((candidate) => String(candidate.id) === String(stage.id));
  return visibleIndex >= 0 ? visibleIndex + 1 : activeStages.length + 1;
}

function getCrmFriendlyError(error: unknown, fallback: string) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Voce nao tem permissao para gerenciar a configuracao do CRM.';
  }

  return toFriendlyError(error, fallback);
}

function getDeleteStageError(error: unknown) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Voce nao tem permissao para excluir esta coluna do CRM.';
  }

  const friendlyMessage = toFriendlyError(error, 'Nao foi possivel excluir esta coluna.');
  const normalizedMessage = friendlyMessage.toLowerCase();

  if (normalizedMessage.includes('primeira') && (normalizedMessage.includes('coluna') || normalizedMessage.includes('stage') || normalizedMessage.includes('etapa'))) {
    return 'A primeira coluna do pipeline nao pode ser excluida porque nao existe uma etapa anterior para receber os leads.';
  }

  return friendlyMessage;
}

function getStageActionError(error: unknown, fallback: string) {
  const friendlyMessage = getCrmFriendlyError(error, fallback);
  const normalizedMessage = friendlyMessage.toLowerCase();

  if (
    normalizedMessage.includes('ordem') &&
    (normalizedMessage.includes('coluna') || normalizedMessage.includes('stage') || normalizedMessage.includes('etapa'))
  ) {
    return 'A ordem das colunas mudou no CRM. Atualize a lista e tente novamente.';
  }

  return friendlyMessage;
}

export function CRMConfigPage() {
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [stages, setStages] = useState<CrmPipelineStage[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackToastState | null>(null);
  const [pipelineModalState, setPipelineModalState] = useState<PipelineModalState | null>(null);
  const [stageModalState, setStageModalState] = useState<StageModalState | null>(null);
  const [pipelineModalError, setPipelineModalError] = useState<string | null>(null);
  const [stageModalError, setStageModalError] = useState<string | null>(null);
  const [deleteStageError, setDeleteStageError] = useState<string | null>(null);
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isDeletingStage, setIsDeletingStage] = useState(false);
  const [movingStageId, setMovingStageId] = useState<string | number | null>(null);
  const [deleteStageTarget, setDeleteStageTarget] = useState<CrmPipelineStage | null>(null);
  const stageRequestIdRef = useRef(0);

  const activePipeline = useMemo(() => pipelines.find((pipeline) => pipeline.ativo) ?? null, [pipelines]);
  const visiblePipeline = useMemo(() => activePipeline ?? pipelines[0] ?? null, [activePipeline, pipelines]);
  const orderedStages = useMemo(() => sortStagesByOrder(stages), [stages]);
  const activeStages = useMemo(() => orderedStages.filter((stage) => stage.ativa), [orderedStages]);
  const inactiveStages = useMemo(() => orderedStages.filter((stage) => !stage.ativa), [orderedStages]);

  const loadPipelines = useCallback(async () => {
    setIsLoadingPipelines(true);
    setPipelinesError(null);

    try {
      const [listedPipelines, active] = await Promise.all([getCrmPipelines(), getActiveCrmPipeline()]);
      const mergedPipelines = mergeActivePipeline(listedPipelines, active);

      setPipelines(mergedPipelines);
    } catch (error) {
      setPipelines([]);
      setPipelinesError(getCrmFriendlyError(error, 'Nao foi possivel carregar o funil do CRM.'));
    } finally {
      setIsLoadingPipelines(false);
    }
  }, []);

  const loadStages = useCallback(async (pipelineId: string | number, options?: { silent?: boolean }) => {
    const requestId = ++stageRequestIdRef.current;

    if (!options?.silent) {
      setIsLoadingStages(true);
    }

    setStagesError(null);

    try {
      const loadedStages = await getCrmStages(pipelineId);

      if (stageRequestIdRef.current !== requestId) {
        return;
      }

      setStages(loadedStages);
    } catch (error) {
      if (stageRequestIdRef.current !== requestId) {
        return;
      }

      setStages([]);
      setStagesError(getCrmFriendlyError(error, 'Nao foi possivel carregar as colunas deste pipeline.'));
    } finally {
      if (stageRequestIdRef.current === requestId && !options?.silent) {
        setIsLoadingStages(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (!visiblePipeline) {
      stageRequestIdRef.current += 1;
      setStages([]);
      setStagesError(null);
      setIsLoadingStages(false);
      return;
    }

    loadStages(visiblePipeline.id);
  }, [loadStages, visiblePipeline]);

  const handleSavePipeline = async (values: { nome: string; ativo: boolean }) => {
    setIsSavingPipeline(true);
    setPipelineModalError(null);

    try {
      if (pipelineModalState?.mode === 'edit') {
        await updateCrmPipeline(pipelineModalState.pipeline.id, values);
      } else {
        await createCrmPipeline(values);
      }

      setPipelineModalState(null);
      setFeedback({
        title: pipelineModalState?.mode === 'edit' ? 'Pipeline atualizado' : 'Pipeline criado',
        description:
          pipelineModalState?.mode === 'edit'
            ? 'As configuracoes do pipeline foram atualizadas com sucesso.'
            : 'O funil principal do CRM foi criado com sucesso.',
        variant: 'success',
      });
      await loadPipelines();
    } catch (error) {
      setPipelineModalError(getCrmFriendlyError(error, 'Nao foi possivel salvar este pipeline.'));
    } finally {
      setIsSavingPipeline(false);
    }
  };

  const handleSaveStage = async (values: {
    nome: string;
    ordem: number;
    cor: string;
    tipo: CrmPipelineStageType;
    setor: string;
    rolesPermitidas: string[];
    slaHoras?: number;
    ativa: boolean;
  }) => {
    if (!visiblePipeline) {
      return;
    }

    setIsSavingStage(true);
    setStageModalError(null);

    const shouldAppendToActiveOrder =
      stageModalState?.mode === 'create' || (stageModalState?.mode === 'edit' && !stageModalState.stage.ativa && values.ativa);

    const payload = {
      pipelineId: visiblePipeline.id,
      nome: values.nome,
      ordem: shouldAppendToActiveOrder ? activeStages.length + 1 : values.ordem,
      cor: values.cor,
      tipo: values.tipo,
      setor: values.setor as CrmStageSetor,
      rolesPermitidas: values.rolesPermitidas as CrmStageRole[],
      slaHoras: values.slaHoras ?? null,
      ativa: values.ativa,
    };

    try {
      if (stageModalState?.mode === 'edit') {
        await updateCrmStage(stageModalState.stage.id, payload);
      } else {
        await createCrmStage(payload);
      }

      setStageModalState(null);
      setFeedback({
        title: stageModalState?.mode === 'edit' ? 'Coluna atualizada' : 'Coluna criada',
        description:
          stageModalState?.mode === 'edit'
            ? 'A coluna do pipeline foi atualizada com sucesso.'
            : 'A nova coluna foi criada no final da sequencia ativa do funil.',
        variant: 'success',
      });
      await loadStages(visiblePipeline.id, { silent: true });
    } catch (error) {
      setStageModalError(getStageActionError(error, 'Nao foi possivel salvar esta coluna.'));
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleMoveStage = async (stage: CrmPipelineStage, direction: 'up' | 'down') => {
    if (!visiblePipeline) {
      return;
    }

    const previousStages = stages;
    const reorderedStages = reorderStagesLocally(activeStages, stage.id, direction);

    if (reorderedStages.length === 0 || reorderedStages.every((item, index) => String(item.id) === String(activeStages[index]?.id))) {
      return;
    }

    setStages(mergeReorderedStages(previousStages, reorderedStages));
    setMovingStageId(stage.id);

    try {
      await reorderCrmStages({
        pipelineId: visiblePipeline.id,
        stages: reorderedStages.map((item) => ({
          id: item.id,
          ordem: item.ordem,
        })),
      });

      await loadStages(visiblePipeline.id, { silent: true });

      setFeedback({
        title: 'Ordem atualizada',
        description: 'A sequencia visivel das colunas ativas foi atualizada com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      setStages(previousStages);
      setFeedback({
        title: 'Nao foi possivel reordenar',
        description: getStageActionError(error, 'Tente novamente para salvar a nova ordem das colunas.'),
        variant: 'error',
      });
    } finally {
      setMovingStageId(null);
    }
  };

  const handleDeleteStage = async () => {
    if (!visiblePipeline || !deleteStageTarget) {
      return;
    }

    setIsDeletingStage(true);
    setDeleteStageError(null);

    try {
      await deleteCrmStage(deleteStageTarget.id);
      setDeleteStageTarget(null);
      setFeedback({
        title: 'Coluna excluida',
        description: 'A coluna foi removida e os leads foram realocados automaticamente para a etapa anterior.',
        variant: 'success',
      });
      await loadStages(visiblePipeline.id, { silent: true });
    } catch (error) {
      setDeleteStageError(getDeleteStageError(error));
    } finally {
      setIsDeletingStage(false);
    }
  };

  return (
    <main className="content-page">
      <PageHeader
        title="Configuracao do CRM"
        subtitle="Somente administradores podem configurar o funil da imobiliaria e organizar as colunas do Kanban."
        actions={
          !isLoadingPipelines && !pipelinesError && !visiblePipeline ? (
            <Button
              onClick={() => {
                setPipelineModalError(null);
                setPipelineModalState({ mode: 'create' });
              }}
            >
              Criar pipeline
            </Button>
          ) : null
        }
      />

      {feedback ? (
        <div className="toast-stack">
          <Toast title={feedback.title} description={feedback.description} variant={feedback.variant} onClose={() => setFeedback(null)} />
        </div>
      ) : null}

      {isLoadingPipelines ? (
        <section className="crm-layout">
          <Card className="crm-pipelines-card">
            <div className="crm-pipeline-skeleton-list">
              <Skeleton height={24} />
              <Skeleton height={120} />
              <Skeleton height={120} />
            </div>
          </Card>
          <Card className="crm-stages-card">
            <div className="crm-stage-skeleton-grid">
              <Skeleton height={28} className="crm-stage-skeleton-grid__title" />
              <div className="crm-stage-skeleton-grid__cards">
                <Skeleton height={220} />
                <Skeleton height={220} />
                <Skeleton height={220} />
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {!isLoadingPipelines && pipelinesError ? (
        <Card
          title="Nao foi possivel carregar o CRM"
          subtitle="Revise a permissao do usuario ou tente novamente em instantes."
          actions={
            <Button variant="secondary" onClick={() => loadPipelines()}>
              Tentar novamente
            </Button>
          }
        >
          <div className="global-error">{pipelinesError}</div>
        </Card>
      ) : null}

      {!isLoadingPipelines && !pipelinesError && pipelines.length === 0 ? (
        <Card className="crm-empty-card">
          <EmptyState
            title="Configure o funil do CRM"
            description="Sua imobiliaria ainda nao tem pipeline configurada. Crie o funil principal para organizar as etapas do CRM e liberar a operacao comercial."
            action={
              <Button onClick={() => setPipelineModalState({ mode: 'create' })}>
                Criar pipeline
              </Button>
            }
          />
        </Card>
      ) : null}

      {!isLoadingPipelines && !pipelinesError && visiblePipeline ? (
        <section className="crm-layout">
          <div className="crm-layout__sidebar">
            <Card
              className="crm-active-pipeline-card"
              title="Funil da imobiliaria"
              subtitle="Este e o unico pipeline visivel do CRM nesta fase do produto."
            >
              <div className="crm-active-pipeline">
                <div>
                  <strong>{visiblePipeline.nome}</strong>
                  <p>
                    {visiblePipeline.updatedAt
                      ? `Atualizado em ${dateFormatter.format(new Date(visiblePipeline.updatedAt))}`
                      : 'Funil configurado para esta imobiliaria.'}
                  </p>
                </div>
                <div className="crm-pipeline-item__badges">
                  <Badge variant="info">Principal</Badge>
                  <Badge variant={visiblePipeline.ativo ? 'success' : 'warning'}>
                    {visiblePipeline.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div className="crm-pipeline-summary">
                <span>{activeStages.length} coluna(s) ativa(s) na sequencia visivel</span>
                {inactiveStages.length > 0 ? <span>{inactiveStages.length} coluna(s) inativa(s) fora da ordenacao principal</span> : null}
              </div>

              <div className="crm-pipeline-item__actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPipelineModalError(null);
                    setPipelineModalState({ mode: 'edit', pipeline: visiblePipeline });
                  }}
                >
                  Editar pipeline
                </Button>
              </div>
            </Card>
          </div>

          <div className="crm-layout__content">
            <Card
              className="crm-stages-card"
              title={visiblePipeline.nome}
              subtitle={
                'Gerencie as colunas do funil e ajuste a ordem operacional do Kanban da imobiliaria.'
              }
              actions={
                visiblePipeline ? (
                  <div className="page-header__button-group">
                    <Button
                      onClick={() => {
                        setStageModalError(null);
                        setStageModalState({ mode: 'create' });
                      }}
                    >
                      Nova coluna
                    </Button>
                  </div>
                ) : null
              }
            >
              {visiblePipeline ? (
                <div className="crm-pipeline-summary">
                  <Badge variant={visiblePipeline.ativo ? 'success' : 'warning'}>
                    {visiblePipeline.ativo ? 'Pipeline configurado' : 'Pipeline configurado, mas inativo'}
                  </Badge>
                  <span>{activeStages.length} coluna(s) ativa(s) na ordem operacional</span>
                  {inactiveStages.length > 0 ? <span>{inactiveStages.length} coluna(s) inativa(s) fora do fluxo principal</span> : null}
                </div>
              ) : null}

              {isLoadingStages ? (
                <div className="crm-stage-skeleton-grid">
                  <div className="crm-stage-skeleton-grid__cards">
                    <Skeleton height={220} />
                    <Skeleton height={220} />
                    <Skeleton height={220} />
                  </div>
                </div>
              ) : null}

              {!isLoadingStages && stagesError ? <div className="global-error">{stagesError}</div> : null}

              {!isLoadingStages && !stagesError && visiblePipeline && stages.length === 0 ? (
                <EmptyState
                  title="Nenhuma coluna cadastrada"
                  description="Crie a primeira coluna para estruturar o funil comercial da imobiliaria."
                  action={
                    <Button onClick={() => setStageModalState({ mode: 'create' })}>
                      Criar primeira coluna
                    </Button>
                  }
                />
              ) : null}

              {!isLoadingStages && !stagesError && visiblePipeline && stages.length > 0 ? (
                <>
                  <div className="crm-stage-section">
                    <div className="crm-stage-section__header">
                      <div>
                        <h3>Colunas ativas</h3>
                        <p>A ordem operacional e visual considera somente estas colunas.</p>
                      </div>
                      <Badge variant="info">{activeStages.length} ativa(s)</Badge>
                    </div>

                    {activeStages.length > 0 ? (
                      <StageConfigBoard
                        stages={activeStages}
                        movingStageId={movingStageId}
                        deletingStageId={deleteStageTarget?.id ?? null}
                        isDisabled={movingStageId !== null || isSavingStage || isDeletingStage}
                        ariaLabel="Colunas ativas do pipeline"
                        onEdit={(stage) => {
                          setStageModalError(null);
                          setStageModalState({ mode: 'edit', stage });
                        }}
                        onMoveUp={(stage) => handleMoveStage(stage, 'up')}
                        onMoveDown={(stage) => handleMoveStage(stage, 'down')}
                        onDelete={(stage) => {
                          setDeleteStageError(null);
                          setDeleteStageTarget(stage);
                        }}
                      />
                    ) : (
                      <EmptyState
                        title="Nenhuma coluna ativa"
                        description="As colunas inativas continuam no cadastro, mas nao participam da sequencia visivel do CRM."
                        action={
                          <Button onClick={() => setStageModalState({ mode: 'create' })}>
                            Criar nova coluna ativa
                          </Button>
                        }
                      />
                    )}
                  </div>

                  {inactiveStages.length > 0 ? (
                    <div className="crm-stage-section">
                      <div className="crm-stage-section__header">
                        <div>
                          <h3>Colunas inativas</h3>
                          <p>Elas permanecem cadastradas, mas nao ocupam posicoes na ordenacao principal.</p>
                        </div>
                        <Badge variant="warning">{inactiveStages.length} inativa(s)</Badge>
                      </div>

                      <StageConfigBoard
                        stages={inactiveStages}
                        movingStageId={movingStageId}
                        deletingStageId={deleteStageTarget?.id ?? null}
                        isDisabled={movingStageId !== null || isSavingStage || isDeletingStage}
                        ariaLabel="Colunas inativas do pipeline"
                        allowReorder={false}
                        getOrderLabel={() => 'Fora da ordenacao ativa'}
                        onEdit={(stage) => {
                          setStageModalError(null);
                          setStageModalState({ mode: 'edit', stage });
                        }}
                        onMoveUp={(stage) => handleMoveStage(stage, 'up')}
                        onMoveDown={(stage) => handleMoveStage(stage, 'down')}
                        onDelete={(stage) => {
                          setDeleteStageError(null);
                          setDeleteStageTarget(stage);
                        }}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </Card>
          </div>
        </section>
      ) : null}

      {pipelineModalState ? (
        <PipelineFormModal
          mode={pipelineModalState.mode}
          pipeline={pipelineModalState.mode === 'edit' ? pipelineModalState.pipeline : null}
          isSubmitting={isSavingPipeline}
          error={pipelineModalError}
          onClose={() => {
            if (isSavingPipeline) {
              return;
            }

            setPipelineModalError(null);
            setPipelineModalState(null);
          }}
          onSubmit={handleSavePipeline}
        />
      ) : null}

      {stageModalState && visiblePipeline ? (
        <StageFormModal
          mode={stageModalState.mode}
          stage={stageModalState.mode === 'edit' ? stageModalState.stage : null}
          defaultOrder={
            stageModalState.mode === 'create'
              ? activeStages.length + 1
              : getVisibleStageOrder(stageModalState.stage, activeStages)
          }
          isSubmitting={isSavingStage}
          error={stageModalError}
          onClose={() => {
            if (isSavingStage) {
              return;
            }

            setStageModalError(null);
            setStageModalState(null);
          }}
          onSubmit={handleSaveStage}
        />
      ) : null}

      {deleteStageTarget ? (
        <StageDeleteModal
          stageName={deleteStageTarget.nome}
          isSubmitting={isDeletingStage}
          error={deleteStageError}
          onClose={() => {
            if (isDeletingStage) {
              return;
            }

            setDeleteStageError(null);
            setDeleteStageTarget(null);
          }}
          onConfirm={handleDeleteStage}
        />
      ) : null}
    </main>
  );
}
