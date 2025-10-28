'use client';

import { requestJson } from './http';

export type AuditEvent = {
  id: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  action: string;
  metadata?: unknown;
  createdAt: string;
};

export type AuditEventListResponse = {
  items: AuditEvent[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchAuditEvents(options?: {
  tenantId?: string | null;
  limit?: number;
  since?: Date;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<AuditEventListResponse> {
  return requestJson<AuditEventListResponse>('/activity/audit', {
    searchParams: {
      tenantId: options?.tenantId ?? undefined,
      limit: options?.limit ? String(options.limit) : undefined,
      since: options?.since ? options.since.toISOString() : undefined,
      cursor: options?.cursor ?? undefined
    },
    signal: options?.signal
  });
}
