import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '../api/types';
import { useAuth } from './useAuth';

type RequireRoleProps = {
  allowedRoles: UserRole[];
  redirectTo?: string;
  forbiddenMessage?: string;
};

export function RequireRole({
  allowedRoles,
  redirectTo = '/app',
  forbiddenMessage = 'Sem permissao para acessar esta area.',
}: RequireRoleProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} state={{ forbidden: true, forbiddenMessage }} replace />;
  }

  return <Outlet />;
}
