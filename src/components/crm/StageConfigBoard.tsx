import { crmStageRoleLabels, crmStageSetorLabels, crmStageTypeLabels, type CrmPipelineStage } from '../../types/crm';
import { getContrastTextColor, normalizeHexColor, toRgba } from '../../utils/color';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type StageConfigBoardProps = {
  stages: CrmPipelineStage[];
  movingStageId: string | number | null;
  deletingStageId: string | number | null;
  isDisabled: boolean;
  ariaLabel?: string;
  allowReorder?: boolean;
  getOrderLabel?: (stage: CrmPipelineStage, index: number) => string | null;
  onEdit: (stage: CrmPipelineStage) => void;
  onMoveUp: (stage: CrmPipelineStage) => void;
  onMoveDown: (stage: CrmPipelineStage) => void;
  onDelete: (stage: CrmPipelineStage) => void;
};

const typeToneMap = {
  FRIO: 'info',
  QUENTE: 'warning',
  PERDIDO: 'danger',
  CONCLUIDO_COM_SUCESSO: 'success',
} as const;

const statusToneMap = {
  true: 'success',
  false: 'warning',
} as const;

export function StageConfigBoard({
  stages,
  movingStageId,
  deletingStageId,
  isDisabled,
  ariaLabel = 'Colunas do pipeline',
  allowReorder = true,
  getOrderLabel = (_, index) => `Ordem ${index + 1}`,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: StageConfigBoardProps) {
  return (
    <div className="crm-stage-board" role="list" aria-label={ariaLabel}>
      {stages.map((stage, index) => {
        const isMoving = movingStageId !== null && String(movingStageId) === String(stage.id);
        const isDeleting = deletingStageId !== null && String(deletingStageId) === String(stage.id);
        const stageColor = normalizeHexColor(stage.cor, '#94A3B8');
        const stageColorText = getContrastTextColor(stageColor);
        const orderLabel = getOrderLabel(stage, index);
        const rolesLabel =
          stage.rolesPermitidas.length > 0
            ? stage.rolesPermitidas.map((role) => crmStageRoleLabels[role]).join(', ')
            : 'Sem restricao';

        return (
          <article
            key={stage.id}
            className={['crm-stage-card', isMoving || isDeleting ? 'crm-stage-card--moving' : ''].filter(Boolean).join(' ')}
            role="listitem"
          >
            <div className="crm-stage-card__accent" style={{ backgroundColor: stageColor }} aria-hidden="true" />

            <div className="crm-stage-card__header">
              <div>
                {orderLabel ? <span className="crm-stage-card__order">{orderLabel}</span> : null}
                <h3>{stage.nome}</h3>
              </div>
              <Badge variant={typeToneMap[stage.tipo]}>{crmStageTypeLabels[stage.tipo]}</Badge>
            </div>

            <div className="crm-stage-card__meta">
              <div>
                <span>Cor</span>
                <strong
                  className="crm-stage-card__color-value"
                  style={{
                    backgroundColor: stageColor,
                    color: stageColorText,
                    boxShadow: `inset 0 0 0 1px ${toRgba(stageColor, 0.18)}`,
                  }}
                >
                  <span
                    className="crm-stage-card__color-dot"
                    style={{ backgroundColor: stageColorText, opacity: 0.32 }}
                    aria-hidden="true"
                  />
                  Cor definida
                </strong>
              </div>
              <div>
                <span>SLA</span>
                <strong>{stage.slaHoras !== null ? `${stage.slaHoras}h` : 'Nao definido'}</strong>
              </div>
              <div>
                <span>Setor</span>
                <strong>{stage.setor ? crmStageSetorLabels[stage.setor] : 'Nao informado'}</strong>
              </div>
              <div>
                <span>Roles</span>
                <strong>{rolesLabel}</strong>
              </div>
            </div>

            <div className="crm-stage-card__footer">
              <Badge variant={statusToneMap[String(stage.ativa) as keyof typeof statusToneMap]}>{stage.ativa ? 'Ativa' : 'Inativa'}</Badge>

              <div className="crm-stage-card__actions">
                <Button variant="ghost" size="sm" onClick={() => onEdit(stage)} disabled={isDisabled}>
                  Editar
                </Button>
                {allowReorder ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => onMoveUp(stage)} disabled={isDisabled || index === 0}>
                      Subir
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onMoveDown(stage)}
                      disabled={isDisabled || index === stages.length - 1}
                    >
                      Descer
                    </Button>
                  </>
                ) : null}
                <Button variant="danger" size="sm" onClick={() => onDelete(stage)} disabled={isDisabled}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
