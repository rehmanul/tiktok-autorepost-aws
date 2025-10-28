'use client';

import { requestJson } from './http';

export type DashboardOverview = {
  totals: {
    tenants: number;
    connections: number;
    rules: number;
    successfulRepostsLast24h: number;
  };
  connectionHealth: Array<{
    platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'TWITTER';
    healthy: number;
    warning: number;
    critical: number;
  }>;
  automation: {
    completed: number;
    retrying: number;
    failed: number;
    completedPercentage: number;
    retryingPercentage: number;
    failedPercentage: number;
  };
  onboarding: {
    newTenantsLast7d: number;
    invitedUsersLast7d: number;
    activeUsersLast7d: number;
    provisioningSlaCompliance: number | null;
  };
  incidents: Array<{
    id: string;
    status: 'new' | 'investigating' | 'mitigated';
    message: string;
    occurredAt: string;
    kind: string;
  }>;
};

export async function fetchDashboardOverview(options?: {
  tenantId?: string;
  signal?: AbortSignal;
}): Promise<DashboardOverview> {
  return requestJson<DashboardOverview>('/dashboard/overview', {
    searchParams: { tenantId: options?.tenantId },
    signal: options?.signal
  });
}
