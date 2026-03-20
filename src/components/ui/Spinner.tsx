type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = 'Carregando' }: SpinnerProps) {
  return (
    <span className="ui-spinner-wrap" role="status" aria-live="polite" aria-label={label}>
      <span className="ui-spinner" aria-hidden="true" />
      <span className="ui-spinner__label">{label}</span>
    </span>
  );
}
