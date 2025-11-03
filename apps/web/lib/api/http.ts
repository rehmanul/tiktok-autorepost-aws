'use client';

import { appConfig } from '../config';

export function resolveBaseUrl() {
  const configured = (appConfig.apiBaseUrl ?? '').replace(/\/$/, '');
  const isAbsolute = /^https?:\/\//i.test(configured);
  if (isAbsolute || typeof window === 'undefined') {
    return configured || 'http://localhost:4000/api';
  }
  const prefix = configured.startsWith('/') ? '' : '/';
  return `${window.location.origin}${prefix}${configured}`;
}

export function buildApiUrl(path: string, searchParams?: Record<string, string | undefined>) {
  const base = resolveBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

export async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    searchParams?: Record<string, string | undefined>;
    signal?: AbortSignal;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = buildApiUrl(path, options.searchParams);
  
  const accessToken = typeof window !== 'undefined' 
    ? window.localStorage.getItem('auth.accessToken') 
    : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function parseError(response: Response) {
  try {
    const body = await response.json();
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    }
  } catch {
    // Swallow JSON parsing errors and fall back to status text.
  }
  return response.statusText || 'Request failed';
}
