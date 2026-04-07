import type { EntityId } from '../../../api/types';
import type { CrmLead } from '../../../types/crm';
import { Badge } from '../../ui/Badge';
import {
  calculateAge,
  formatCurrency,
  formatPhone,
  getInitials,
  getLeadOwners,
  hasFinancialData,
  truncateText,
} from './leadUtils';

type LeadListProps = {
  leads: CrmLead[];
  selectedLeadId: EntityId | null;
  onSelectLead: (lead: CrmLead) => void;
};

export function LeadList({ leads, selectedLeadId, onSelectLead }: LeadListProps) {
  return (
    <div className="crm-leads-list" role="list" aria-label="Lista de leads">
      {leads.map((lead) => {
        const isSelected = selectedLeadId !== null && String(selectedLeadId) === String(lead.id);
        const visibleOwners = lead.responsaveis.slice(0, 3);
        const age = calculateAge(lead.dataNascimento);
        const pipelineName = lead.pipeline?.nome ?? 'Pipeline';
        const stageName = lead.stage?.nome ?? 'Sem etapa';

        return (
          <article
            key={lead.id}
            className={['crm-leads-list__item', isSelected ? 'crm-leads-list__item--selected' : ''].filter(Boolean).join(' ')}
            role="listitem"
          >
            <button type="button" className="crm-leads-list__surface" onClick={() => onSelectLead(lead)}>
              <div className="crm-leads-list__header">
                <div>
                  <h3>{lead.nome}</h3>
                  <p>{formatPhone(lead.telefone)}</p>
                </div>
                <div className="crm-leads-list__badges">
                  <Badge variant="info">{lead.origem || 'Sem origem'}</Badge>
                  <Badge variant="neutral">{stageName}</Badge>
                </div>
              </div>

              <div className="crm-leads-list__meta">
                <span>{lead.email || 'E-mail nao informado'}</span>
                <span>{pipelineName}</span>
              </div>

              {lead.informacoesAdicionais ? (
                <div className="crm-leads-list__notes">
                  <span>Informacoes adicionais</span>
                  <p title={lead.informacoesAdicionais}>{truncateText(lead.informacoesAdicionais, 160)}</p>
                </div>
              ) : null}

              {hasFinancialData(lead) ? (
                <div className="crm-leads-list__financial">
                  {lead.entrada !== null ? (
                    <div>
                      <span>Entrada</span>
                      <strong>{formatCurrency(lead.entrada)}</strong>
                    </div>
                  ) : null}
                  {lead.fgts !== null ? (
                    <div>
                      <span>FGTS</span>
                      <strong>{formatCurrency(lead.fgts)}</strong>
                    </div>
                  ) : null}
                  {lead.renda !== null ? (
                    <div>
                      <span>Renda</span>
                      <strong>{formatCurrency(lead.renda)}</strong>
                    </div>
                  ) : null}
                  {age !== null ? (
                    <div>
                      <span>Idade</span>
                      <strong>{age} anos</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="crm-leads-list__footer">
                <div className="crm-leads-list__owners">
                  <div className="crm-avatar-stack" aria-label="Responsaveis do lead">
                    {visibleOwners.map((user) => (
                      <span key={user.id} className="crm-avatar-chip" title={user.nome}>
                        {getInitials(user.nome)}
                      </span>
                    ))}
                    {lead.responsaveis.length > visibleOwners.length ? (
                      <span className="crm-avatar-chip crm-avatar-chip--more">+{lead.responsaveis.length - visibleOwners.length}</span>
                    ) : null}
                  </div>
                  <span className="crm-leads-list__owners-copy">
                    {getLeadOwners(lead).length} pessoa(s) com acesso
                  </span>
                </div>
                <span className="crm-leads-list__cta">Ver detalhes</span>
              </div>
            </button>
          </article>
        );
      })}
    </div>
  );
}
