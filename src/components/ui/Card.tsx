import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'div';
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function Card({
  as: Component = 'section',
  title,
  subtitle,
  actions,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <Component className={['saas-card', className].filter(Boolean).join(' ')} {...props}>
      {(title || subtitle || actions) && (
        <div className="saas-card__header">
          <div>
            {title ? <h2 className="saas-card__title">{title}</h2> : null}
            {subtitle ? <p className="saas-card__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="saas-card__actions">{actions}</div> : null}
        </div>
      )}
      <div className="saas-card__body">{children}</div>
    </Component>
  );
}
