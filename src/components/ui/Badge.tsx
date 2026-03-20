import type { HTMLAttributes } from 'react';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span className={['ui-badge', `ui-badge--${variant}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
