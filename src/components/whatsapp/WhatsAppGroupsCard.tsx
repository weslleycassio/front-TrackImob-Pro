import { MessageCircle, RefreshCw, Users } from 'lucide-react';
import type { WhatsAppGroup } from '../../types/whatsapp';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

type WhatsAppGroupsCardProps = {
  instanceName?: string | null;
  groups: WhatsAppGroup[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onUseGroup: (group: WhatsAppGroup) => void;
};

export function WhatsAppGroupsCard({
  instanceName,
  groups,
  isLoading,
  error,
  onRefresh,
  onUseGroup,
}: WhatsAppGroupsCardProps) {
  return (
    <Card
      className="whatsapp-card"
      title="Grupos do WhatsApp"
      subtitle="Veja os grupos disponiveis na instancia e use qualquer JID diretamente no envio de mensagem teste."
      actions={
        <Button
          variant="secondary"
          icon={<RefreshCw size={16} aria-hidden="true" />}
          onClick={onRefresh}
          disabled={!instanceName || isLoading}
        >
          {isLoading ? 'Carregando...' : 'Atualizar grupos'}
        </Button>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      {!instanceName ? (
        <EmptyState
          title="Instancia ainda nao definida"
          description="Assim que o WhatsApp estiver configurado, esta secao passa a listar os grupos retornados pela API."
        />
      ) : null}

      {instanceName && isLoading ? (
        <div className="whatsapp-groups-list" aria-hidden="true">
          <Skeleton height={110} />
          <Skeleton height={110} />
          <Skeleton height={110} />
        </div>
      ) : null}

      {instanceName && !isLoading && groups.length === 0 ? (
        <EmptyState
          title="Nenhum grupo retornado"
          description="A instancia esta ativa, mas a API ainda nao retornou grupos. Atualize novamente quando houver sincronizacao."
        />
      ) : null}

      {instanceName && !isLoading && groups.length > 0 ? (
        <div className="whatsapp-groups-list">
          {groups.map((group) => (
            <article key={group.id} className="whatsapp-group-card">
              <div className="whatsapp-group-card__header">
                <div className="whatsapp-group-card__icon" aria-hidden="true">
                  <Users size={18} />
                </div>
                <div>
                  <h3>{group.name}</h3>
                  <p>{group.description || 'Grupo sincronizado com a instancia conectada.'}</p>
                </div>
              </div>

              <div className="whatsapp-group-card__meta">
                <div>
                  <span>JID</span>
                  <strong>{group.id}</strong>
                </div>
                <div>
                  <span>Participantes</span>
                  <strong>{group.participantsCount ?? 'Nao informado'}</strong>
                </div>
                <div>
                  <span>Dono</span>
                  <strong>{group.owner ?? 'Nao informado'}</strong>
                </div>
              </div>

              <div className="whatsapp-group-card__actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<MessageCircle size={16} aria-hidden="true" />}
                  onClick={() => onUseGroup(group)}
                >
                  Enviar mensagem
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
