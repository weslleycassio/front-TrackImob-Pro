import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../auth/RequireAuth';
import { RequireRole } from '../auth/RequireRole';
import { AppLayout } from '../layout/AppLayout';
import { AppHomePage } from '../pages/AppHome/AppHomePage';
import { CRMConfigPage } from '../pages/CRM/CRMConfigPage';
import { CRMContactsPage } from '../pages/CRM/CRMContactsPage';
import { CRMPage } from '../pages/CRM/CRMPage';
import { ForgotPasswordPage } from '../pages/Login/ForgotPasswordPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { ResetPasswordPage } from '../pages/Login/ResetPasswordPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { ImovelCreate, ImovelEdit } from '../pages/Imovel/ImovelCreate';
import { ConsultaImoveisPage, VisualizarImovelPage } from '../pages/imoveis';
import { CreateUser } from '../pages/Users/CreateUser';
import { ListUsers } from '../pages/Users/ListUsers';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app/crm/quadro" element={<CRMPage boardOnly />} />

        <Route element={<AppLayout />}>
          <Route path="/app" element={<AppHomePage />} />
          <Route path="/imoveis" element={<ConsultaImoveisPage />} />
          <Route path="/imoveis/cadastrar" element={<ImovelCreate />} />
          <Route path="/imoveis/:id/editar" element={<ImovelEdit />} />
          <Route path="/imoveis/:id" element={<VisualizarImovelPage />} />
          <Route path="/app/usuarios" element={<ListUsers />} />
          <Route path="/app/crm" element={<CRMPage />} />
          <Route path="/app/leads" element={<CRMContactsPage />} />
          <Route path="/app/contatos" element={<Navigate to="/app/leads" replace />} />

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
                redirectTo="/app/usuarios"
                forbiddenMessage="Sem permissao para acessar usuarios."
              />
            }
          >
            <Route path="/app/usuarios/cadastrar" element={<CreateUser />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
