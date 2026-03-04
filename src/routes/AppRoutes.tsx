import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PrivateRoute } from '../auth/PrivateRoute';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { ImovelCreate } from '../pages/Imovel/ImovelCreate';

export function AppRoutes() {
  const location = useLocation();
  const loginMessage = (location.state as { message?: string } | null)?.message;

  return (
    <Routes>
      <Route path="/login" element={<LoginPageWithMessage message={loginMessage} />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/imoveis/cadastrar" element={<ImovelCreate />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

type LoginPageWithMessageProps = {
  message?: string;
};

function LoginPageWithMessage({ message }: LoginPageWithMessageProps) {
  return <LoginPage infoMessage={message} />;
}
