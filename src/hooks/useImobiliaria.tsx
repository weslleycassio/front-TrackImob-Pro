import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ImobiliariaSummary, User } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { getMinhaImobiliaria } from '../services/imobiliaria.service';

type ImobiliariaContextData = {
  imobiliaria: ImobiliariaSummary | null;
  loading: boolean;
  refreshImobiliaria: () => Promise<ImobiliariaSummary | null>;
};

const ImobiliariaContext = createContext<ImobiliariaContextData | undefined>(undefined);

type ImobiliariaProviderProps = {
  children: ReactNode;
};

function getInitialImobiliaria(user: User | null): ImobiliariaSummary | null {
  if (!user?.imobiliariaNome) {
    return null;
  }

  return {
    id: user.imobiliariaId,
    nome: user.imobiliariaNome,
    logoUrl: null,
  };
}

export function ImobiliariaProvider({ children }: ImobiliariaProviderProps) {
  const { user, updateUser } = useAuth();
  const [imobiliaria, setImobiliaria] = useState<ImobiliariaSummary | null>(getInitialImobiliaria(user));
  const [loading, setLoading] = useState(Boolean(user));

  const refreshImobiliaria = useCallback(async () => {
    if (!user || user.role === 'SUPER_ADMIN') {
      setImobiliaria(null);
      setLoading(false);
      return null;
    }

    setLoading(true);

    try {
      const data = await getMinhaImobiliaria();
      setImobiliaria(data);

      if (data.nome && data.nome !== user.imobiliariaNome) {
        updateUser({
          ...user,
          imobiliariaNome: data.nome,
        });
      }

      return data;
    } catch (error) {
      console.error('Erro ao carregar imobiliaria', error);
      setImobiliaria((current) => current ?? getInitialImobiliaria(user));
      return null;
    } finally {
      setLoading(false);
    }
  }, [updateUser, user]);

  useEffect(() => {
    if (!user || user.role === 'SUPER_ADMIN') {
      setImobiliaria(null);
      setLoading(false);
      return;
    }

    setImobiliaria((current) => current ?? getInitialImobiliaria(user));
    void refreshImobiliaria();
  }, [refreshImobiliaria, user]);

  const value = useMemo(
    () => ({
      imobiliaria,
      loading,
      refreshImobiliaria,
    }),
    [imobiliaria, loading, refreshImobiliaria],
  );

  return <ImobiliariaContext.Provider value={value}>{children}</ImobiliariaContext.Provider>;
}

export function useImobiliaria() {
  const context = useContext(ImobiliariaContext);

  if (!context) {
    throw new Error('useImobiliaria deve ser usado dentro de ImobiliariaProvider');
  }

  return context;
}
