'use client';

import { requestJson } from './http';

export type SystemConfig = {
  environment: string;
  runtime: {
    port: number;
  };
  database: {
    protocol?: string;
    host?: string;
    port?: number;
    database?: string;
    parameters?: Record<string, string>;
    raw?: string;
  } | null;
  redis: {
    protocol?: string;
    host?: string;
    port?: number;
    tls: boolean;
    raw?: string;
  };
  features: {
    metrics: boolean;
  };
};

export async function fetchSystemConfig(options?: { signal?: AbortSignal }): Promise<SystemConfig> {
  return requestJson<SystemConfig>('/settings/system', {
    signal: options?.signal
  });
}
