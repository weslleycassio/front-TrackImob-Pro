import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getMinhaImobiliariaRequest } from '../api/imobiliariasService';
import { getLoggedUserRequest } from '../api/usersService';
import { saveStoredUser } from '../auth/storage';
import { useAuth } from '../auth/useAuth';
import { HamburgerMenuDrawer } from '../components/HamburgerMenuDrawer';
import { Topbar } from '../components/Topbar';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [imobiliariaNome, setImobiliariaNome] = useState(user?.imobiliariaNome ?? 'TrackImob Pro');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const handleRefreshUser = async () => {
    if (!user) {
      return;
    }

    try {
      const refreshedUser = await getLoggedUserRequest();
      const nextUser = {
        ...refreshedUser,
        imobiliariaNome: user.imobiliariaNome ?? refreshedUser.imobiliariaNome,
      };

      updateUser(nextUser);
      if (nextUser.imobiliariaNome) {
        setImobiliariaNome(nextUser.imobiliariaNome);
      }
    } catch {
      // Silencia erro para não interromper a navegação do usuário no layout
    }
  };


  return (
    <main className="app-shell-layout">
      <Topbar
        userLabel={userLabel}
        onMenuToggle={() => setIsDrawerOpen(true)}
        onRefreshUser={handleRefreshUser}
      />
      <HamburgerMenuDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onLogout={handleLogout}
      />

      <section className="app-content-with-topbar">
        <Outlet />
      </section>
    </main>
  );
}
