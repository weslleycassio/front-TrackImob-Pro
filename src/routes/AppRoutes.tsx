import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../auth/RequireAuth';
import { RequireRole } from '../auth/RequireRole';
import { AppLayout } from '../layout/AppLayout';
import { AppHomePage } from '../pages/AppHome/AppHomePage';
import { ForgotPasswordPage } from '../pages/Login/ForgotPasswordPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { CreateUser } from '../pages/Users/CreateUser';
import { ListUsers } from '../pages/Users/ListUsers';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<AppHomePage />} />
          <Route path="usuarios" element={<ListUsers />} />

          <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
            <Route path="usuarios/cadastrar" element={<CreateUser />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
