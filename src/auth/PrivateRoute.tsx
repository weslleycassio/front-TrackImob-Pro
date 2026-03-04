import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export function PrivateRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
