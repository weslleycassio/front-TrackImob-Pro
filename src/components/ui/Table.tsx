import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';

export function TableContainer({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ui-table-wrapper', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function Table({ className = '', children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={['ui-table', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </table>
  );
}

type TableEmptyStateProps = {
  children: ReactNode;
};

export function TableEmptyState({ children }: TableEmptyStateProps) {
  return <div className="ui-table-empty">{children}</div>;
}
