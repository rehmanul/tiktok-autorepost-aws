'use client';

import { requestJson } from './http';

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  connectionCount: number;
  ruleCount: number;
  lastActivityAt: string | null;
};

export type TenantListResponse = {
  items: TenantSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchTenants(options?: {
  search?: string;
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<TenantListResponse> {
  return requestJson<TenantListResponse>('/tenants', {
    searchParams: {
      search: options?.search,
      limit: options?.limit ? String(options.limit) : undefined,
      cursor: options?.cursor ?? undefined
    },
    signal: options?.signal
  });
}
