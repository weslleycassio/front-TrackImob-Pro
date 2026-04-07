import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { changePasswordRequest, updateLoggedUserRequest } from '../api/usersService';
import type { AlterarSenhaPayload, UpdateMeRequest } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { useImobiliaria } from '../hooks/useImobiliaria';
import { APP_NAME, setDocumentTitle } from '../config/app';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

type ProfileModalMode = 'perfil' | 'senha';

const initialPasswordForm: AlterarSenhaPayload = {
  senhaAtual: '',
  novaSenha: '',
  confirmarNovaSenha: '',
};

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { imobiliaria, loading: isLoadingImobiliaria } = useImobiliaria();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<ProfileModalMode>('perfil');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<UpdateMeRequest>({
    nome: user?.nome ?? '',
    email: user?.email ?? '',
    telefone: user?.telefone ?? '',
  });
  const [passwordForm, setPasswordForm] = useState<AlterarSenhaPayload>(initialPasswordForm);

  useEffect(() => {
    setDocumentTitle();
  }, []);

  useEffect(() => {
    if (!profileSuccess) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setProfileSuccess(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [profileSuccess]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const openProfileModal = () => {
    if (!user) {
      return;
    }

    setProfileError(null);
    setProfileSuccess(null);
    setProfileModalMode('perfil');
    setPasswordForm(initialPasswordForm);
    setProfileForm({
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
    });
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    if (isUpdatingUser || isUpdatingPassword) {
      return;
    }

    setIsProfileModalOpen(false);
    setProfileModalMode('perfil');
    setProfileError(null);
    setPasswordForm(initialPasswordForm);
  };

  const onSaveProfile = async () => {
    if (!user) {
      return;
    }

    const payload: UpdateMeRequest = {
      nome: profileForm.nome.trim(),
      email: profileForm.email.trim(),
      telefone: onlyDigits(profileForm.telefone),
    };

    if (!payload.nome || !payload.email || !payload.telefone) {
      setProfileError('Preencha nome, e-mail e telefone.');
      return;
    }

    const hasChanges =
      payload.nome !== user.nome || payload.email !== user.email || payload.telefone !== onlyDigits(user.telefone);

    if (!hasChanges) {
      setProfileError('Altere ao menos um campo antes de salvar.');
      return;
    }

    setIsUpdatingUser(true);
    setProfileError(null);

    try {
      const refreshedUser = await updateLoggedUserRequest(payload);
      const nextUser = {
        ...refreshedUser,
        imobiliariaNome: user.imobiliariaNome ?? refreshedUser.imobiliariaNome,
      };

      updateUser(nextUser);

      setProfileSuccess('Perfil atualizado com sucesso no sistema.');
      setIsProfileModalOpen(false);
    } catch {
      setProfileError('Nao foi possivel atualizar seus dados.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const onSavePassword = async () => {
    const payload = {
      senhaAtual: passwordForm.senhaAtual.trim(),
      novaSenha: passwordForm.novaSenha.trim(),
      confirmarNovaSenha: passwordForm.confirmarNovaSenha.trim(),
    };

    if (!payload.senhaAtual || !payload.novaSenha || !payload.confirmarNovaSenha) {
      setProfileError('Preencha todos os campos.');
      return;
    }

    if (payload.novaSenha !== payload.confirmarNovaSenha) {
      setProfileError('A nova senha e a confirmacao nao conferem.');
      return;
    }

    setIsUpdatingPassword(true);
    setProfileError(null);

    try {
      await changePasswordRequest(payload);
      setProfileSuccess('Senha alterada com sucesso.');
      setPasswordForm(initialPasswordForm);
      setProfileModalMode('perfil');
      setIsProfileModalOpen(false);
    } catch (error: unknown) {
      const apiMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : null;

      setProfileError(apiMessage ?? 'Erro ao alterar senha.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <main className="saas-shell">
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        companyName={imobiliaria?.nome}
        companyLogoUrl={imobiliaria?.logoUrl}
        isCompanyLoading={isLoadingImobiliaria}
      />

      <div className="saas-shell__content">
        <AppHeader
          companyName={imobiliaria?.nome ?? APP_NAME}
          userName={user?.nome ?? 'Usuario'}
          userRole={user?.role ?? 'Equipe'}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onProfileClick={openProfileModal}
        />

        <section className="saas-shell__main">
          {profileSuccess ? (
            <div className="toast-stack">
              <Toast title="Atualização concluída" description={profileSuccess} variant="success" onClose={() => setProfileSuccess(null)} />
            </div>
          ) : null}
          <Outlet />
          <AppFooter />
        </section>
      </div>

      {isProfileModalOpen ? (
        <Modal
          title={profileModalMode === 'perfil' ? 'Editar perfil' : 'Alterar senha'}
          actionsClassName="profile-modal__actions"
          subtitle={
            profileModalMode === 'perfil'
              ? 'Mantenha seus dados atualizados para uma operacao mais confiavel.'
              : 'Use uma senha forte para proteger sua conta.'
          }
          onClose={closeProfileModal}
          actions={
            profileModalMode === 'perfil' ? (
              <>
                <Button variant="ghost" className="profile-modal__button" onClick={() => setProfileModalMode('senha')} disabled={isUpdatingUser}>
                  Alterar senha
                </Button>
                <Button variant="secondary" className="profile-modal__button" onClick={closeProfileModal} disabled={isUpdatingUser}>
                  Cancelar
                </Button>
                <Button className="profile-modal__button" onClick={onSaveProfile} disabled={isUpdatingUser}>
                  {isUpdatingUser ? 'Salvando...' : 'Salvar perfil'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="profile-modal__button"
                  onClick={() => setProfileModalMode('perfil')}
                  disabled={isUpdatingPassword}
                >
                  Voltar
                </Button>
                <Button className="profile-modal__button" onClick={onSavePassword} disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </>
            )
          }
        >
          {profileError ? <div className="global-error">{profileError}</div> : null}

          {profileModalMode === 'perfil' ? (
            <div className="modal-form-grid">
              <Input
                id="profile-nome"
                label="Nome"
                value={profileForm.nome}
                onChange={(event) => setProfileForm((current) => ({ ...current, nome: event.target.value }))}
              />
              <Input
                id="profile-email"
                label="E-mail"
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
              />
              <Input
                id="profile-telefone"
                label="Telefone"
                value={profileForm.telefone}
                onChange={(event) => setProfileForm((current) => ({ ...current, telefone: event.target.value }))}
              />
            </div>
          ) : (
            <div className="modal-form-grid">
              <Input
                id="profile-senha-atual"
                label="Senha atual"
                type="password"
                value={passwordForm.senhaAtual}
                onChange={(event) => setPasswordForm((current) => ({ ...current, senhaAtual: event.target.value }))}
              />
              <Input
                id="profile-nova-senha"
                label="Nova senha"
                type="password"
                value={passwordForm.novaSenha}
                onChange={(event) => setPasswordForm((current) => ({ ...current, novaSenha: event.target.value }))}
              />
              <Input
                id="profile-confirmar-nova-senha"
                label="Confirmar nova senha"
                type="password"
                value={passwordForm.confirmarNovaSenha}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmarNovaSenha: event.target.value,
                  }))
                }
              />
            </div>
          )}
        </Modal>
      ) : null}
    </main>
  );
}
