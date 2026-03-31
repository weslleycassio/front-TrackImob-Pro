import { useMemo, useState } from 'react';
import type { EntityId } from '../../api/types';
import type { CrmLead, CrmPipelineStage } from '../../types/crm';
import { normalizeHexColor, toRgba } from '../../utils/color';
import { calculateAge, formatCurrency, formatPhone, getInitials, hasFinancialData, truncateText } from './leads/leadUtils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type LeadKanbanBoardProps = {
  stages: CrmPipelineStage[];
  leads: CrmLead[];
  movingLeadId: EntityId | null;
  onMoveLead: (lead: CrmLead, targetStageId: EntityId) => void;
  canMoveLead: (lead: CrmLead) => boolean;
  selectedLeadId?: EntityId | null;
  onSelectLead?: (lead: CrmLead) => void;
};

export function LeadKanbanBoard({
  stages,
  leads,
  movingLeadId,
  onMoveLead,
  canMoveLead,
  selectedLeadId = null,
  onSelectLead,
}: LeadKanbanBoardProps) {
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [hoverStageId, setHoverStageId] = useState<string | null>(null);

  const groupedLeads = useMemo(() => {
    const initialGroups = stages.reduce<Record<string, CrmLead[]>>((accumulator, stage) => {
      accumulator[String(stage.id)] = [];
      return accumulator;
    }, {});

    leads.forEach((lead) => {
      const stageId = String(lead.stageId);
      if (!initialGroups[stageId]) {
        initialGroups[stageId] = [];
      }

      initialGroups[stageId].push(lead);
    });

    return initialGroups;
  }, [leads, stages]);

  const leadIndexByStage = useMemo(() => {
    return stages.reduce<Record<string, number>>((accumulator, stage, index) => {
      accumulator[String(stage.id)] = index;
      return accumulator;
    }, {});
  }, [stages]);

  return (
    <div className="crm-leads-board" role="list" aria-label="Kanban de leads">
      {stages.map((stage) => {
        const stageId = String(stage.id);
        const stageColor = normalizeHexColor(stage.cor, '#94A3B8');
        const stageLeads = groupedLeads[stageId] ?? [];
        const isDropTarget = hoverStageId === stageId;

        return (
          <section
            key={stage.id}
            className={['crm-leads-column', isDropTarget ? 'crm-leads-column--drop-target' : ''].filter(Boolean).join(' ')}
            role="listitem"
            onDragOver={(event) => {
              if (!draggingLeadId) {
                return;
              }

              event.preventDefault();
              setHoverStageId(stageId);
            }}
            onDragLeave={() => {
              setHoverStageId((current) => (current === stageId ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();

              const draggedLead = leads.find((lead) => String(lead.id) === draggingLeadId);
              setHoverStageId(null);
              setDraggingLeadId(null);

              if (!draggedLead || String(draggedLead.stageId) === stageId || !canMoveLead(draggedLead)) {
                return;
              }

              onMoveLead(draggedLead, stage.id);
            }}
          >
            <header className="crm-leads-column__header" style={{ borderColor: toRgba(stageColor, 0.22) }}>
              <div className="crm-leads-column__title">
                <span className="crm-leads-column__dot" style={{ backgroundColor: stageColor }} aria-hidden="true" />
                <div>
                  <h3>{stage.nome}</h3>
                  <p>{stageLeads.length} lead(s)</p>
                </div>
              </div>
              <Badge variant="neutral">{stageLeads.length}</Badge>
            </header>

            <div className="crm-leads-column__content">
              {stageLeads.length === 0 ? (
                <div className="crm-leads-column__empty">Nenhum lead nesta etapa.</div>
              ) : null}

              {stageLeads.map((lead) => {
                const isMoving = movingLeadId !== null && String(movingLeadId) === String(lead.id);
                const isSelected = selectedLeadId !== null && String(selectedLeadId) === String(lead.id);
                const canMove = canMoveLead(lead);
                const stageIndex = leadIndexByStage[String(lead.stageId)] ?? -1;
                const previousStage = stageIndex > 0 ? stages[stageIndex - 1] : null;
                const nextStage = stageIndex >= 0 && stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null;
                const responsavelPrincipal = lead.responsaveis[0]?.nome ?? lead.createdByUser?.nome ?? 'Definido automaticamente';
                const visibleCoResponsaveis = lead.coResponsaveis.slice(0, 3);
                const financialHighlights = [
                  lead.entrada !== null ? { label: 'Entrada', value: formatCurrency(lead.entrada) } : null,
                  lead.fgts !== null ? { label: 'FGTS', value: formatCurrency(lead.fgts) } : null,
                  lead.renda !== null ? { label: 'Renda', value: formatCurrency(lead.renda) } : null,
                  calculateAge(lead.dataNascimento) !== null ? { label: 'Idade', value: `${calculateAge(lead.dataNascimento)} anos` } : null,
                ].filter((item): item is { label: string; value: string } => item !== null);

                return (
                  <article
                    key={lead.id}
                    className={[
                      'crm-lead-card',
                      onSelectLead ? 'crm-lead-card--interactive' : '',
                      isSelected ? 'crm-lead-card--selected' : '',
                      isMoving ? 'crm-lead-card--moving' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    draggable={canMove && !isMoving}
                    role={onSelectLead ? 'button' : undefined}
                    tabIndex={onSelectLead ? 0 : undefined}
                    aria-label={onSelectLead ? `Abrir detalhes de ${lead.nome}` : undefined}
                    onClick={() => onSelectLead?.(lead)}
                    onKeyDown={(event) => {
                      if (!onSelectLead) {
                        return;
                      }

                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectLead(lead);
                      }
                    }}
                    onDragStart={(event) => {
                      if (!canMove) {
                        return;
                      }

                      event.dataTransfer.setData('text/plain', String(lead.id));
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggingLeadId(String(lead.id));
                    }}
                    onDragEnd={() => {
                      setDraggingLeadId(null);
                      setHoverStageId(null);
                    }}
                  >
                    <div className="crm-lead-card__header">
                      <div>
                        <h4>{lead.nome}</h4>
                        <p>{formatPhone(lead.telefone)}</p>
                      </div>
                      <Badge variant="info">{lead.origem || 'Sem origem'}</Badge>
                    </div>

                    {hasFinancialData(lead) && financialHighlights.length > 0 ? (
                      <div className="crm-lead-card__financial">
                        {financialHighlights.map((item) => (
                          <div key={`${lead.id}-${item.label}`}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {lead.informacoesAdicionais ? (
                      <div className="crm-lead-card__notes">
                        <span>Informacoes adicionais</span>
                        <p title={lead.informacoesAdicionais}>{truncateText(lead.informacoesAdicionais)}</p>
                      </div>
                    ) : null}

                    <div className="crm-lead-card__footer">
                      <div className="crm-lead-card__owners">
                        <div className="crm-lead-card__assignment">
                          <span>Responsavel</span>
                          <strong title={responsavelPrincipal}>{responsavelPrincipal}</strong>
                        </div>
                        {lead.coResponsaveis.length > 0 ? (
                          <div className="crm-lead-card__coowners">
                            <div className="crm-avatar-stack" aria-label="Co-responsaveis">
                              {visibleCoResponsaveis.map((user) => (
                                <span key={user.id} className="crm-avatar-chip" title={user.nome}>
                                  {getInitials(user.nome)}
                                </span>
                              ))}
                              {lead.coResponsaveis.length > visibleCoResponsaveis.length ? (
                                <span className="crm-avatar-chip crm-avatar-chip--more">
                                  +{lead.coResponsaveis.length - visibleCoResponsaveis.length}
                                </span>
                              ) : null}
                            </div>
                            <span className="crm-lead-card__coowners-text">
                              {lead.coResponsaveis.length} co-responsavel(is)
                            </span>
                          </div>
                        ) : (
                          <span className="crm-lead-card__coowners crm-lead-card__coowners--empty">Sem co-responsaveis</span>
                        )}
                      </div>

                      <div className="crm-lead-card__actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canMove || !previousStage || isMoving}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!previousStage) {
                              return;
                            }

                            onMoveLead(lead, previousStage.id);
                          }}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!canMove || !nextStage || isMoving}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!nextStage) {
                              return;
                            }

                            onMoveLead(lead, nextStage.id);
                          }}
                        >
                          Proxima
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
