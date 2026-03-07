import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getMinhaImobiliariaRequest } from '../api/imobiliariasService';

import { changePasswordRequest, updateLoggedUserRequest } from '../api/usersService';
import type { AlterarSenhaPayload, UpdateMeRequest } from '../api/types';
import { saveStoredUser } from '../auth/storage';
import { useAuth } from '../auth/useAuth';
import { HamburgerMenuDrawer } from '../components/HamburgerMenuDrawer';
import { Topbar } from '../components/Topbar';

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
  const [imobiliariaNome, setImobiliariaNome] = useState(user?.imobiliariaNome ?? 'TrackImob Pro');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.imobiliariaNome) {
      setImobiliariaNome(user.imobiliariaNome);
      return;
    }

    const loadImobiliariaNome = async () => {
      try {
        const data = await getMinhaImobiliariaRequest(user.imobiliariaId);
        setImobiliariaNome(data.nome);
        saveStoredUser({ ...user, imobiliariaNome: data.nome });
      } catch {
        setImobiliariaNome(user.imobiliariaNome ?? 'TrackImob Pro');
      }
    };

    loadImobiliariaNome();
  }, [navigate, user]);

  const userLabel = useMemo(() => {
    if (!user) return 'TrackImob Pro';
    return `${imobiliariaNome} - ${user.nome} - ${user.role}`;
  }, [imobiliariaNome, user]);

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

  const goToPasswordMode = () => {
    setProfileError(null);
    setPasswordForm(initialPasswordForm);
    setProfileModalMode('senha');
  };

  const goToProfileMode = () => {
    if (isUpdatingPassword) {
      return;
    }

    setProfileError(null);
    setPasswordForm(initialPasswordForm);
    setProfileModalMode('perfil');
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
    setProfileSuccess(null);

    try {
      const refreshedUser = await updateLoggedUserRequest(payload);
      const nextUser = {
        ...refreshedUser,
        imobiliariaNome: user.imobiliariaNome ?? refreshedUser.imobiliariaNome,
      };

      updateUser(nextUser);
      if (nextUser.imobiliariaNome) {
        setImobiliariaNome(nextUser.imobiliariaNome);
      }

      setProfileSuccess('Dados atualizados com sucesso.');
      setIsProfileModalOpen(false);
    } catch {
      setProfileError('Não foi possível atualizar seus dados.');
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
      setProfileError('A nova senha e a confirmação da senha não conferem.');
      return;
    }

    setIsUpdatingPassword(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await changePasswordRequest(payload);
      setProfileSuccess('Senha alterada com sucesso.');
      setPasswordForm(initialPasswordForm);
      setProfileModalMode('perfil');
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
    <main className="app-shell-layout">
      <Topbar userLabel={userLabel} onMenuToggle={() => setIsDrawerOpen(true)} onProfileClick={openProfileModal} />

      <HamburgerMenuDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onLogout={handleLogout}
      />

      <section className="app-content-with-topbar">
        {profileSuccess && <div className="global-success">{profileSuccess}</div>}
        <Outlet />
      </section>

      {isProfileModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <h2 id="profile-edit-title">{profileModalMode === 'perfil' ? 'Editar meu perfil' : 'Alterar senha'}</h2>

            {profileError && <div className="global-error">{profileError}</div>}

            {profileModalMode === 'perfil' ? (
              <>
                <div className="form-group">
                  <label htmlFor="profile-nome">Nome</label>
                  <input
                    id="profile-nome"
                    type="text"
                    value={profileForm.nome}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        nome: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-email">E-mail</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-telefone">Telefone</label>
                  <input
                    id="profile-telefone"
                    type="text"
                    inputMode="numeric"
                    value={profileForm.telefone}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        telefone: event.target.value,
                      }))
                    }
                  />
                </div>

                <button type="button" className="profile-password-link" onClick={goToPasswordMode} disabled={isUpdatingUser}>
                  Alterar senha
                </button>

                <div className="row">
                  <button type="button" className="secondary" onClick={closeProfileModal} disabled={isUpdatingUser}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary modal-save-button"
                    onClick={onSaveProfile}
                    disabled={isUpdatingUser}
                  >
                    {isUpdatingUser ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="profile-senha-atual">Senha atual</label>
                  <input
                    id="profile-senha-atual"
                    type="password"
                    value={passwordForm.senhaAtual}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        senhaAtual: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-nova-senha">Nova senha</label>
                  <input
                    id="profile-nova-senha"
                    type="password"
                    value={passwordForm.novaSenha}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        novaSenha: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-confirmar-nova-senha">Confirmar nova senha</label>
                  <input
                    id="profile-confirmar-nova-senha"
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

                <div className="row">
                  <button type="button" className="secondary" onClick={goToProfileMode} disabled={isUpdatingPassword}>
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="primary modal-save-button"
                    onClick={onSavePassword}
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
