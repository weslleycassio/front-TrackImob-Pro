import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, error, hint, className = '', children, ...props },
  ref,
) {
  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <select id={id} ref={ref} className={['ui-control', className].filter(Boolean).join(' ')} {...props}>
        {children}
      </select>
      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && hint ? <span className="ui-field__hint">{hint}</span> : null}
    </div>
  );
});
