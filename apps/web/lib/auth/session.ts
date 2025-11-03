'use client';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  USER: 'auth.user'
} as const;

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    tenantId: string;
  };
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);

  if (!accessToken || !refreshToken || !userStr) {
    return null;
  }

  try {
    const user = JSON.parse(userStr);
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

