'use client';

import { requestJson } from './http';

export type UserSummary = {
  id: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  email: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  connectionCount: number;
  ruleCount: number;
  jobCount: number;
  lastActivityAt: string | null;
};

export type UserListResponse = {
  items: UserSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchUsers(options?: {
  tenantId?: string | null;
  status?: string;
  role?: string;
  search?: string;
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<UserListResponse> {
  return requestJson<UserListResponse>('/users', {
    searchParams: {
      tenantId: options?.tenantId ?? undefined,
      status: options?.status ?? undefined,
      role: options?.role ?? undefined,
      search: options?.search,
      limit: options?.limit ? String(options.limit) : undefined,
      cursor: options?.cursor ?? undefined
    },
    signal: options?.signal
  });
}
