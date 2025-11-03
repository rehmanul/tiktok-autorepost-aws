'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSession, setSession, clearSession, getRefreshToken } from '@/lib/auth/session';
import { login as apiLogin, signup as apiSignup, refresh as apiRefresh, logout as apiLogout, getMe, User } from '@/lib/api/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSession = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      const me = await getMe();
      setUser(me);
    } catch {
      const refreshToken = getRefreshToken();
      if (refreshToken && !isRefreshing) {
        setIsRefreshing(true);
        try {
          const { accessToken } = await apiRefresh(refreshToken);
          const newSession = { ...session, accessToken };
          setSession(newSession);
          const me = await getMe();
          setUser(me);
        } catch {
          clearSession();
          setUser(null);
        } finally {
          setIsRefreshing(false);
        }
      } else {
        clearSession();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isRefreshing]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    setSession(response);
    const userWithStatus: User = { ...response.user, status: response.user.status ?? 'ACTIVE' };
    setUser(userWithStatus);
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName: string, tenantId: string) => {
    const response = await apiSignup({ email, password, displayName, tenantId });
    setSession(response);
    const userWithStatus: User = { ...response.user, status: response.user.status ?? 'ACTIVE' };
    setUser(userWithStatus);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch {
        // Ignore errors on logout
      }
    }
    clearSession();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const { accessToken } = await apiRefresh(refreshToken);
    const session = getSession();
    if (session) {
      setSession({ ...session, accessToken });
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refresh
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

