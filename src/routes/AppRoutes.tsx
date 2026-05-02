import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../auth/RequireAuth';
import { RequireRole } from '../auth/RequireRole';
import { useAuth } from '../auth/useAuth';
import { AppLayout } from '../layout/AppLayout';
import { AppHomePage } from '../pages/AppHome/AppHomePage';
import { ConfigsAdminPage } from '../pages/ConfigsAdmin/ConfigsAdminPage';
import { CRMConfigPage } from '../pages/CRM/CRMConfigPage';
import { CRMContactsPage } from '../pages/CRM/CRMContactsPage';
import { CRMPage } from '../pages/CRM/CRMPage';
import { ForgotPasswordPage } from '../pages/Login/ForgotPasswordPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { ResetPasswordPage } from '../pages/Login/ResetPasswordPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { ImovelCreate, ImovelEdit } from '../pages/Imovel/ImovelCreate';
import { ConsultaImoveisPage, VisualizarImovelPage } from '../pages/imoveis';
import { WhatsAppConversationsPage } from '../pages/WhatsApp/WhatsAppConversationsPage';
import { WhatsAppSettingsPage } from '../pages/WhatsApp/WhatsAppSettingsPage';
import { CreateUser } from '../pages/Users/CreateUser';
import { ListUsers } from '../pages/Users/ListUsers';

function DefaultRouteRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user?.role === 'SUPER_ADMIN' ? '/configs-admin' : '/app'} replace />;
}

function AppEntryRoute() {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/configs-admin" replace />;
  }

  return <AppHomePage />;
}

function RequireSuperAdminAccess() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/configs-admin/login" replace />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/configs-admin/login" replace />;
  }

  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/configs-admin/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

      <Route element={<RequireSuperAdminAccess />}>
        <Route element={<AppLayout />}>
          <Route path="/configs-admin" element={<ConfigsAdminPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/app/crm/quadro" element={<CRMPage boardOnly />} />

        <Route element={<AppLayout />}>
          <Route path="/app" element={<AppEntryRoute />} />
          <Route path="/imoveis" element={<ConsultaImoveisPage />} />
          <Route path="/imoveis/cadastrar" element={<ImovelCreate />} />
          <Route path="/imoveis/:id/editar" element={<ImovelEdit />} />
          <Route path="/imoveis/:id" element={<VisualizarImovelPage />} />
          <Route path="/app/usuarios" element={<ListUsers />} />
          <Route path="/app/crm" element={<CRMPage />} />
          <Route path="/app/leads" element={<CRMContactsPage />} />
          <Route path="/app/contatos" element={<Navigate to="/app/leads" replace />} />
          <Route path="/crm/conversas" element={<WhatsAppConversationsPage />} />

          <Route
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                redirectTo="/app"
                forbiddenMessage="Sem permissao para acessar a configuracao do CRM."
              />
            }
          >
            <Route path="/app/crm/config" element={<CRMConfigPage />} />
          </Route>

          <Route
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                redirectTo="/crm/conversas"
                forbiddenMessage="Sem permissao para acessar a configuracao do WhatsApp."
              />
            }
          >
            <Route path="/configuracoes/whatsapp" element={<WhatsAppSettingsPage />} />
          </Route>

          <Route
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                redirectTo="/app/usuarios"
                forbiddenMessage="Sem permissao para acessar usuarios."
              />
            }
          >
            <Route path="/app/usuarios/cadastrar" element={<CreateUser />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<DefaultRouteRedirect />} />
      <Route path="*" element={<DefaultRouteRedirect />} />
    </Routes>
  );
}
