'use client';

import { requestJson } from './http';

export type JobStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type JobsOverview = {
  timeframeStart: string;
  statusCounts: Record<JobStatus, number>;
  backlogCount: number;
  averageDurationSeconds: number | null;
};

export type RecentJob = {
  id: string;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  userId: string;
  kind: string;
  status: JobStatus;
  attempts: number;
  priority: number;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ruleId: string | null;
  postLogId: string | null;
  sourceConnectionId: string | null;
  destinationConnectionId: string | null;
  error?: {
    message?: string;
    details?: Record<string, unknown>;
  };
};

export async function fetchJobsOverview(options?: {
  tenantId?: string;
  signal?: AbortSignal;
}): Promise<JobsOverview> {
  return requestJson<JobsOverview>('/jobs/overview', {
    searchParams: { tenantId: options?.tenantId },
    signal: options?.signal
  });
}

export async function fetchRecentJobs(options?: {
  tenantId?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<RecentJob[]> {
  return requestJson<RecentJob[]>('/jobs/recent', {
    searchParams: {
      tenantId: options?.tenantId,
      limit: options?.limit ? String(options.limit) : undefined
    },
    signal: options?.signal
  });
}
