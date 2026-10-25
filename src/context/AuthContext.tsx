import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type AuthUser } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const response = await api.getAuthMe();
        if (!active) return;
        setUser(response.user);
        setError(null);
      } catch (cause) {
        if (!active) return;
        setUser(null);
        if (
          cause instanceof Error &&
          ![
            'authentication_required',
            'invalid_access_token',
            'invalid_access_session',
          ].includes(cause.message)
        ) {
          setError(cause.message);
        } else {
          setError(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response.user);
    setError(null);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await api.register(email, password);
    setUser(response.user);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setError(null);
  }, []);

  const startGoogleLogin = useCallback(async () => {
    const { authorizationUrl } = await api.googleLogin();
    window.location.assign(authorizationUrl);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, error, login, register, logout, startGoogleLogin }),
    [user, isLoading, error, login, register, logout, startGoogleLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
