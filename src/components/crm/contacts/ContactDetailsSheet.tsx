import { useEffect } from 'react';
import type { CrmContact } from '../../../types/crm';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { formatPhone } from '../leads/leadUtils';

type ContactDetailsSheetProps = {
  isOpen: boolean;
  contact: CrmContact | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
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

export function ContactDetailsSheet({ isOpen, contact, isLoading, error, onClose, onRetry }: ContactDetailsSheetProps) {
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

  return (
    <>
      {isOpen ? <button type="button" className="sheet-overlay" aria-label="Fechar detalhes do contato" onClick={onClose} /> : null}
      <aside className={`right-side-sheet ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="crm-contact-details-title">
        <div className="right-side-sheet-header">
          <div>
            <p className="right-side-sheet-eyebrow">Contato</p>
            <h2 id="crm-contact-details-title">{contact?.nome ?? 'Detalhes do contato'}</h2>
          </div>
          <button type="button" className="secondary right-side-sheet-close" onClick={onClose}>
            Fechar
          </button>
        </div>

        {isLoading ? (
          <div className="crm-lead-details__loading">
            <Spinner label="Carregando detalhes do contato" />
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

        {!isLoading && !error && !contact ? <p className="right-side-sheet-empty">Selecione um contato para ver os detalhes.</p> : null}

        {!isLoading && !error && contact ? (
          <div className="crm-contact-details">
            <section className="right-side-sheet-section">
              <div className="crm-contact-details__headline">
                <Badge variant="info">Base da imobiliaria</Badge>
                <Badge variant={contact.leadsCount > 0 ? 'success' : 'neutral'}>
                  {contact.leadsCount === 1 ? '1 lead vinculado' : `${contact.leadsCount} leads vinculados`}
                </Badge>
              </div>

              <dl className="imovel-detail-list">
                <div>
                  <dt>Telefone</dt>
                  <dd>{formatPhone(contact.telefone)}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{contact.email || 'Nao informado'}</dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{formatDate(contact.createdAt)}</dd>
                </div>
                <div>
                  <dt>Ultima atualizacao</dt>
                  <dd>{formatDate(contact.updatedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="right-side-sheet-section">
              <h3>Relacao com o CRM</h3>
              {contact.leads.length > 0 ? (
                <div className="crm-readonly-list">
                  {contact.leads.map((lead) => (
                    <article key={lead.id} className="crm-readonly-list__item">
                      <strong>{lead.nome}</strong>
                      <span>{`${lead.pipeline?.nome ?? 'Pipeline nao informado'} - ${lead.stage?.nome ?? 'Etapa nao informada'}`}</span>
                      <span>{lead.origem ?? 'Origem nao informada'}</span>
                      <span>{lead.createdAt ? `Criado em ${formatDate(lead.createdAt)}` : 'Data de cadastro indisponivel'}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="crm-contact-details__empty">Este contato ainda nao possui leads vinculados retornados pela API.</p>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </>
  );
}
