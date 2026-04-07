import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { User } from '../api/types';
import {
  type LogoutReason,
  clearStoredLogoutReason,
  getStoredLastActivityAt,
  getStoredLogoutReason,
  saveStoredLastActivityAt,
  saveStoredLogoutReason,
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
} from './session';
import { clearAuthStorage, getStoredToken, getStoredUser, saveStoredToken, saveStoredUser } from './storage';
import { getTokenExpiresAt, isTokenExpired } from './token';

type AuthContextData = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  logoutReason: LogoutReason | null;
  login: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  clearLogoutReason: () => void;
  logout: (reason?: LogoutReason) => void;
};

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

function getInitialToken() {
  const storedToken = getStoredToken();
  if (!storedToken) {
    return null;
  }

  if (isTokenExpired(storedToken)) {
    saveStoredLogoutReason('expired');
    clearAuthStorage();
    return null;
  }

  return storedToken;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => getInitialToken());
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(() => getStoredLogoutReason());
  const [lastActivityAt, setLastActivityAt] = useState<number>(() => getStoredLastActivityAt() ?? Date.now());
  const expirationTimeoutRef = useRef<number | null>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(lastActivityAt);

  const clearSessionTimeouts = useCallback(() => {
    if (expirationTimeoutRef.current !== null) {
      window.clearTimeout(expirationTimeoutRef.current);
      expirationTimeoutRef.current = null;
    }

    if (inactivityTimeoutRef.current !== null) {
      window.clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearLogoutReason = useCallback(() => {
    setLogoutReason(null);
    clearStoredLogoutReason();
  }, []);

  const logout = useCallback(
    (reason: LogoutReason = 'manual') => {
      clearSessionTimeouts();
      setToken(null);
      setUser(null);

      if (reason === 'manual') {
        setLogoutReason(null);
        clearStoredLogoutReason();
      } else {
        setLogoutReason(reason);
        saveStoredLogoutReason(reason);
      }

      clearAuthStorage();
      navigate('/login', { replace: true });
    },
    [clearSessionTimeouts, navigate],
  );

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const registerActivity = useCallback((timestamp = Date.now()) => {
    lastActivityRef.current = timestamp;
    setLastActivityAt(timestamp);
    saveStoredLastActivityAt(timestamp);
  }, []);

  useEffect(() => {
    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logoutRef.current('unauthorized');
        }

        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      clearSessionTimeouts();
      return;
    }

    const now = Date.now();
    const inactivityDeadline = lastActivityAt + SESSION_INACTIVITY_TIMEOUT_MS;

    lastActivityRef.current = lastActivityAt;

    if (isTokenExpired(token, now)) {
      logout('expired');
      return;
    }

    if (inactivityDeadline <= now) {
      logout('inactive');
      return;
    }

    const expiresAt = getTokenExpiresAt(token);

    if (!expiresAt) {
      logout('expired');
      return;
    }

    expirationTimeoutRef.current = window.setTimeout(() => {
      logoutRef.current('expired');
    }, Math.max(expiresAt - now, 0));

    inactivityTimeoutRef.current = window.setTimeout(() => {
      logoutRef.current('inactive');
    }, Math.max(inactivityDeadline - now, 0));

    return () => {
      clearSessionTimeouts();
    };
  }, [clearSessionTimeouts, lastActivityAt, logout, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    registerActivity();

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < SESSION_ACTIVITY_THROTTLE_MS) {
        return;
      }

      registerActivity(now);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'focus'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, [registerActivity, token]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) {
        return;
      }

      if (event.key === 'token') {
        if (!event.newValue) {
          logoutRef.current('sync');
          return;
        }

        if (event.newValue !== token) {
          setToken(event.newValue);
        }
      }

      if (event.key === 'user') {
        if (!event.newValue) {
          setUser(null);
          return;
        }

        try {
          setUser(JSON.parse(event.newValue) as User);
        } catch {
          setUser(null);
        }
      }

      if (event.key === 'auth:lastActivityAt' && event.newValue) {
        const nextTimestamp = Number(event.newValue);
        if (Number.isFinite(nextTimestamp)) {
          lastActivityRef.current = nextTimestamp;
          setLastActivityAt(nextTimestamp);
        }
      }

      if (event.key === 'auth:logoutReason') {
        setLogoutReason(getStoredLogoutReason());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [token]);

  const handleLogin = useCallback(
    (nextToken: string, nextUser: User) => {
      clearLogoutReason();
      setToken(nextToken);
      setUser(nextUser);
      saveStoredToken(nextToken);
      saveStoredUser(nextUser);
      registerActivity();
    },
    [clearLogoutReason, registerActivity],
  );

  const handleUpdateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    saveStoredUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      logoutReason,
      login: handleLogin,
      updateUser: handleUpdateUser,
      clearLogoutReason,
      logout,
    }),
    [clearLogoutReason, handleLogin, handleUpdateUser, logout, logoutReason, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
