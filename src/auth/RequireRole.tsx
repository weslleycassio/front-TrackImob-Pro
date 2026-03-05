import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '../api/types';
import { useAuth } from './useAuth';

type RequireRoleProps = {
  allowedRoles: UserRole[];
};

export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/app/usuarios" state={{ forbidden: true }} replace />;
  }

  return <Outlet />;
}
