import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { clearStoredToken, getStoredToken, saveStoredToken } from './storage';

type AuthContextData = {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(getStoredToken());

  const logout = useCallback(() => {
    setToken(null);
    clearStoredToken();
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const requestInterceptor = apiClient.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor);
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [logout, token]);

  const handleLogin = useCallback((nextToken: string) => {
    setToken(nextToken);
    saveStoredToken(nextToken);
  }, []);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: handleLogin,
      logout,
    }),
    [handleLogin, logout, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
