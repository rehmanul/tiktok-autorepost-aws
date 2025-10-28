'use client';

import { requestJson } from './http';

export type ConnectionsOverview = {
  totalConnections: number;
  expiringWithin24h: number;
  byPlatform: Array<{
    platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'TWITTER';
    total: number;
    status: {
      ACTIVE: number;
      EXPIRED: number;
      ERROR: number;
      REVOKED: number;
    };
  }>;
  recent: Array<{
    id: string;
    tenantId: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
    userId: string;
    platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'TWITTER';
    accountHandle: string;
    accountDisplayName: string | null;
    status: 'ACTIVE' | 'EXPIRED' | 'ERROR' | 'REVOKED';
    expiresAt: string | null;
    lastSyncedAt: string | null;
    updatedAt: string;
  }>;
};

export async function fetchConnectionsOverview(options?: {
  tenantId?: string;
  signal?: AbortSignal;
}): Promise<ConnectionsOverview> {
  return requestJson<ConnectionsOverview>('/connections/overview', {
    searchParams: { tenantId: options?.tenantId },
    signal: options?.signal
  });
}
