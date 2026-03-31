import { useEffect, useMemo, useState } from 'react';
import type { EntityId } from '../../../api/types';
import { crmStageTypeLabels, type CrmLead, type CrmPipelineStage } from '../../../types/crm';
import { normalizeHexColor, toRgba } from '../../../utils/color';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { Spinner } from '../../ui/Spinner';
import { calculateAge, formatCurrency, formatPhone, truncateText } from './leadUtils';

type LeadDetailsSheetProps = {
  isOpen: boolean;
  lead: CrmLead | null;
  isLoading: boolean;
  error: string | null;
  canEdit?: boolean;
  canChangeStage?: boolean;
  stages?: CrmPipelineStage[];
  stagesLoading?: boolean;
  stagesError?: string | null;
  isUpdatingStage?: boolean;
  stageUpdateError?: string | null;
  onClose: () => void;
  onEdit?: () => void;
  onUpdateStage?: (stageId: EntityId) => Promise<void>;
  onRetry?: () => void;
  onRetryStages?: () => void;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'Nao informado';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(parsed);
}

function toStageOptionLabel(stage: CrmPipelineStage) {
  return stage.ativa ? stage.nome : `${stage.nome} - Inativa`;
}

export function LeadDetailsSheet({
  isOpen,
  lead,
  isLoading,
  error,
  canEdit = false,
  canChangeStage = false,
  stages = [],
  stagesLoading = false,
  stagesError = null,
  isUpdatingStage = false,
  stageUpdateError = null,
  onClose,
  onEdit,
  onUpdateStage,
  onRetry,
  onRetryStages,
}: LeadDetailsSheetProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [selectedStageId, setSelectedStageId] = useState('');
  const age = calculateAge(lead?.dataNascimento ?? null);
  const currentStage = useMemo(() => {
    if (!lead) {
      return null;
    }

    const matchedStage = stages.find((stage) => String(stage.id) === String(lead.stageId));

    if (matchedStage) {
      return matchedStage;
    }

    if (!lead.stage) {
      return null;
    }

    return {
      id: lead.stage.id,
      pipelineId: lead.stage.pipelineId,
      nome: lead.stage.nome,
      ordem: lead.stage.ordem,
      cor: lead.stage.cor,
      tipo: lead.stage.tipo,
      ativa: lead.stage.ativa,
      slaHoras: null,
    };
  }, [lead, stages]);
  const selectableStages = useMemo(() => {
    const activeStages = stages.filter((stage) => stage.ativa);
    const baseStages = activeStages.length > 0 ? activeStages : stages;

    if (!currentStage || baseStages.some((stage) => String(stage.id) === String(currentStage.id))) {
      return baseStages;
    }

    return [currentStage, ...baseStages];
  }, [currentStage, stages]);
  const stageColor = normalizeHexColor(currentStage?.cor, '#94A3B8');
  const stageFieldHint = stagesLoading
    ? 'Carregando colunas disponiveis...'
    : stagesError ?? 'Selecione outra coluna do pipeline para mover este lead.';
  const canSubmitStageUpdate =
    Boolean(lead) &&
    Boolean(selectedStageId) &&
    String(selectedStageId) !== String(lead?.stageId) &&
    !stagesLoading &&
    !isUpdatingStage;

  useEffect(() => {
    if (!lead) {
      setSelectedStageId('');
      return;
    }

    setSelectedStageId(String(currentStage?.id ?? lead.stageId ?? ''));
  }, [currentStage?.id, lead?.id, lead?.stageId]);

  return (
    <>
      {isOpen ? <button type="button" className="sheet-overlay" aria-label="Fechar detalhes do lead" onClick={onClose} /> : null}
      <aside className={`right-side-sheet ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="crm-lead-details-title">
        <div className="right-side-sheet-header">
          <div>
            <p className="right-side-sheet-eyebrow">Lead do CRM</p>
            <h2 id="crm-lead-details-title">{lead?.nome ?? 'Detalhes do lead'}</h2>
          </div>
          <div className="crm-lead-details__header-actions">
            {canEdit && !isLoading && !error && lead && onEdit ? (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Editar lead
              </Button>
            ) : null}
            <button type="button" className="secondary right-side-sheet-close" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="crm-lead-details__loading">
            <Spinner label="Carregando detalhes do lead" />
          </div>
        ) : null}

        {!isLoading && error ? (
          <section className="right-side-sheet-section">
            <p className="right-side-sheet-empty">{error}</p>
            {onRetry ? (
              <Button variant="secondary" className="right-side-sheet-link" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : null}
          </section>
        ) : null}

        {!isLoading && !error && !lead ? <p className="right-side-sheet-empty">Selecione um lead para ver os detalhes.</p> : null}

        {!isLoading && !error && lead ? (
          <div className="crm-lead-details">
            <section className="right-side-sheet-section">
              <h3>Identificacao do lead</h3>
              <div className="crm-lead-details__headline">
                <div className="crm-lead-details__headline-copy">
                  <Badge variant="info">{lead.origem || 'Sem origem'}</Badge>
                  <span>{lead.pipeline?.nome ?? 'Pipeline nao informado'}</span>
                </div>
              </div>

              <dl className="imovel-detail-list">
                <div>
                  <dt>Telefone</dt>
                  <dd>{formatPhone(lead.telefone)}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{lead.email || 'Nao informado'}</dd>
                </div>
                <div>
                  <dt>Origem</dt>
                  <dd>{lead.origem || 'Nao informada'}</dd>
                </div>
              </dl>
            </section>

            <section className="right-side-sheet-section">
              <h3>Situacao no CRM</h3>
              <div className="crm-lead-stage-section__header">
                <div>
                  <p className="crm-lead-stage-section__eyebrow">Etapa atual</p>
                  <div
                    className="crm-lead-stage-pill"
                    style={{
                      backgroundColor: toRgba(stageColor, 0.08),
                      borderColor: toRgba(stageColor, 0.2),
                    }}
                  >
                    <span className="crm-lead-stage-pill__dot" style={{ backgroundColor: stageColor }} aria-hidden="true" />
                    <strong>{currentStage?.nome ?? lead.stage?.nome ?? 'Coluna nao informada'}</strong>
                  </div>
                </div>
                <Badge variant={currentStage?.ativa === false ? 'warning' : 'success'}>
                  {currentStage?.ativa === false ? 'Inativa' : 'Ativa'}
                </Badge>
              </div>

              <dl className="imovel-detail-list">
                <div>
                  <dt>Coluna atual</dt>
                  <dd>{currentStage?.nome ?? lead.stage?.nome ?? 'Nao informada'}</dd>
                </div>
                <div>
                  <dt>Responsavel</dt>
                  <dd>{lead.responsaveis.length > 0 ? lead.responsaveis.map((user) => user.nome).join(', ') : 'Criador assumira automaticamente'}</dd>
                </div>
                <div>
                  <dt>Co-responsaveis</dt>
                  <dd>{lead.coResponsaveis.length > 0 ? lead.coResponsaveis.map((user) => user.nome).join(', ') : 'Nenhum informado'}</dd>
                </div>
                <div>
                  <dt>Tipo da coluna</dt>
                  <dd>
                    {currentStage?.tipo
                      ? crmStageTypeLabels[currentStage.tipo]
                      : lead.stage?.tipo
                        ? crmStageTypeLabels[lead.stage.tipo]
                        : 'Nao informado'}
                  </dd>
                </div>
              </dl>

              {canChangeStage ? (
                <div className="crm-lead-stage-editor">
                  <Select
                    id="crm-detail-lead-stage"
                    label="Alterar coluna"
                    value={selectedStageId}
                    hint={stageFieldHint}
                    disabled={stagesLoading || selectableStages.length === 0 || isUpdatingStage}
                    onChange={(event) => setSelectedStageId(event.target.value)}
                  >
                    {selectableStages.map((stage) => (
                      <option key={`detail-stage-${stage.id}`} value={String(stage.id)}>
                        {toStageOptionLabel(stage)}
                      </option>
                    ))}
                  </Select>

                  <div className="crm-lead-stage-editor__actions">
                    <Button
                      onClick={() => {
                        if (!onUpdateStage || !selectedStageId) {
                          return;
                        }

                        void onUpdateStage(selectedStageId);
                      }}
                      disabled={!canSubmitStageUpdate}
                    >
                      {isUpdatingStage ? 'Salvando...' : 'Atualizar coluna'}
                    </Button>
                    {stagesError && onRetryStages ? (
                      <Button variant="secondary" onClick={onRetryStages} disabled={stagesLoading || isUpdatingStage}>
                        Recarregar colunas
                      </Button>
                    ) : null}
                  </div>

                  {stageUpdateError ? <div className="global-error">{stageUpdateError}</div> : null}
                </div>
              ) : null}
            </section>

            <section className="right-side-sheet-section">
              <h3>Perfil financeiro</h3>
              <dl className="imovel-detail-list">
                <div>
                  <dt>Valor de entrada (ato)</dt>
                  <dd>{formatCurrency(lead.entrada)}</dd>
                </div>
                <div>
                  <dt>FGTS</dt>
                  <dd>{formatCurrency(lead.fgts)}</dd>
                </div>
                <div>
                  <dt>Renda</dt>
                  <dd>{formatCurrency(lead.renda)}</dd>
                </div>
                <div>
                  <dt>Data de nascimento</dt>
                  <dd>{lead.dataNascimento ? formatDate(lead.dataNascimento) : 'Nao informada'}</dd>
                </div>
                <div>
                  <dt>Idade</dt>
                  <dd>{age !== null ? `${age} anos` : 'Nao informada'}</dd>
                </div>
              </dl>
            </section>

            <section className="right-side-sheet-section">
              <h3>Informacoes adicionais</h3>
              <dl className="imovel-detail-list">
                <div>
                  <dt>Criado em</dt>
                  <dd>{formatDate(lead.createdAt)}</dd>
                </div>
                <div>
                  <dt>Ultima atualizacao</dt>
                  <dd>{formatDate(lead.updatedAt)}</dd>
                </div>
                <div>
                  <dt>Criado por</dt>
                  <dd>{lead.createdByUser?.nome ?? 'Nao informado'}</dd>
                </div>
              </dl>

              {lead.informacoesAdicionais ? (
                <p className="crm-lead-details__notes">{truncateText(lead.informacoesAdicionais, 600)}</p>
              ) : (
                <p className="crm-lead-details__notes">Nenhuma observacao adicional registrada para este lead.</p>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </>
  );
}
