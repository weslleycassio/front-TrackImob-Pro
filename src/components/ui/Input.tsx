import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, hint, className = '', ...props },
  ref,
) {
  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input id={id} ref={ref} className={['ui-control', className].filter(Boolean).join(' ')} {...props} />
      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && hint ? <span className="ui-field__hint">{hint}</span> : null}
    </div>
  );
});
