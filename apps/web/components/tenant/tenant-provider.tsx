'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchTenants, type TenantSummary } from '@/lib/api/tenants';

type TenantContextValue = {
  tenantId: string | null;
  tenant: TenantSummary | null;
  tenants: TenantSummary[];
  isLoading: boolean;
  error: string | null;
  setTenantId: (tenantId: string | null) => void;
  refresh: () => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);
const STORAGE_KEY = 'autorepost.selectedTenant';

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedTenant = window.localStorage.getItem(STORAGE_KEY);
    if (storedTenant) {
      setTenantIdState(storedTenant);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    const load = async () => {
      try {
        const aggregate: TenantSummary[] = [];
        let cursor: string | null | undefined;
        let hasMore = true;

        while (hasMore && !controller.signal.aborted) {
          const result = await fetchTenants({
            limit: 100,
            cursor,
            signal: controller.signal
          });
          aggregate.push(...result.items);
          cursor = result.nextCursor;
          hasMore = result.hasMore && Boolean(cursor);
        }

        if (!controller.signal.aborted) {
          setTenants(aggregate);
          setError(null);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        setError((err as Error).message ?? 'Failed to load tenants');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [refreshToken]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }
    if (tenantId) {
      window.localStorage.setItem(STORAGE_KEY, tenantId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [tenantId, hydrated]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }
    const exists = tenants.some((tenant) => tenant.id === tenantId);
    if (!exists) {
      setTenantIdState(null);
    }
  }, [tenantId, tenants]);

  const setTenantId = useCallback((nextTenantId: string | null) => {
    setTenantIdState(nextTenantId ?? null);
  }, []);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const tenant = useMemo(
    () => (tenantId ? tenants.find((item) => item.id === tenantId) ?? null : null),
    [tenantId, tenants]
  );

  const value = useMemo(
    (): TenantContextValue => ({
      tenantId,
      tenant,
      tenants,
      isLoading,
      error,
      setTenantId,
      refresh
    }),
    [tenantId, tenant, tenants, isLoading, error, setTenantId, refresh]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
