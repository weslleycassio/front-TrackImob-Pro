import { useEffect, type ReactNode } from 'react';
import { APP_NAME, setDocumentTitle } from '../../config/app';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  useEffect(() => {
    setDocumentTitle(title);
  }, [title]);

  return (
    <div className="page-header">
      <div className="page-header__content">
        <p className="page-header__eyebrow">{APP_NAME}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
