import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AuthContext,
  type AuthContextValue,
} from './auth-context';
import {
  loginRequest,
  logoutRequest,
  refreshSessionRequest,
} from './auth.api';
import { setAccessToken } from './token-store';
import type {
  AuthUser,
  LoginCredentials,
} from './auth.types';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await refreshSessionRequest();

    setAccessToken(session.data.accessToken);
    setUser(session.data.user);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const session = await loginRequest(credentials);

      setAccessToken(session.data.accessToken);
      setUser(session.data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    const initializationTimeout = window.setTimeout(() => {
      void refreshSession()
        .catch(() => {
          clearSession();
        })
        .finally(() => {
          setIsInitializing(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(initializationTimeout);
    };
  }, [clearSession, refreshSession]);

  useEffect(() => {
    const refreshInterval = window.setInterval(
      () => {
        void refreshSession().catch(() => {
          clearSession();
        });
      },
      14 * 60 * 1000,
    );

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [clearSession, refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInitializing,
      login,
      logout,
      refreshSession,
    }),
    [
      user,
      isInitializing,
      login,
      logout,
      refreshSession,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}