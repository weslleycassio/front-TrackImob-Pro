type ToastVariant = 'success' | 'error' | 'info';

type ToastProps = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  onClose?: () => void;
};

export function Toast({ title, description, variant = 'info', onClose }: ToastProps) {
  return (
    <div className={['ui-toast', `ui-toast--${variant}`].join(' ')} role="status" aria-live="polite">
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {onClose ? (
        <button type="button" className="ui-toast__close" onClick={onClose} aria-label="Fechar notificacao">
          x
        </button>
      ) : null}
    </div>
  );
}
