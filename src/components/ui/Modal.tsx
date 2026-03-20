import type { ReactNode } from 'react';

type ModalProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  onClose?: () => void;
};

export function Modal({ title, subtitle, children, actions, actionsClassName = '', onClose }: ModalProps) {
  return (
    <div className="ui-modal-backdrop" role="presentation">
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
        <div className="ui-modal__header">
          <div>
            <h2 id="ui-modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button type="button" className="ui-modal__close" onClick={onClose} aria-label="Fechar modal">
              x
            </button>
          ) : null}
        </div>
        <div className="ui-modal__content">{children}</div>
        {actions ? <div className={['ui-modal__actions', actionsClassName].filter(Boolean).join(' ')}>{actions}</div> : null}
      </div>
    </div>
  );
}
