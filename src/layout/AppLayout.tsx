import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getMinhaImobiliariaRequest } from '../api/imobiliariasService';

import { updateLoggedUserRequest } from '../api/usersService';
import type { UpdateMeRequest } from '../api/types';
import { saveStoredUser } from '../auth/storage';
import { useAuth } from '../auth/useAuth';
import { HamburgerMenuDrawer } from '../components/HamburgerMenuDrawer';
import { Topbar } from '../components/Topbar';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [imobiliariaNome, setImobiliariaNome] = useState(user?.imobiliariaNome ?? 'TrackImob Pro');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<UpdateMeRequest>({
    nome: user?.nome ?? '',
    email: user?.email ?? '',
    telefone: user?.telefone ?? '',
  });

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
    setProfileForm({
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
    });
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    if (isUpdatingUser) {
      return;
    }

    setIsProfileModalOpen(false);
    setProfileError(null);
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
            <h2 id="profile-edit-title">Editar meu perfil</h2>

            {profileError && <div className="global-error">{profileError}</div>}

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

            <div className="row">
              <button type="button" className="secondary" onClick={closeProfileModal} disabled={isUpdatingUser}>
                Cancelar
              </button>
              <button type="button" className="primary modal-save-button" onClick={onSaveProfile} disabled={isUpdatingUser}>
                {isUpdatingUser ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
