'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSystemConfig, type SystemConfig } from '@/lib/api/settings';

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    fetchSystemConfig({ signal: controller.signal })
      .then((result) => {
        setConfig(result);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load system configuration');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [refreshToken]);

  const handleRefresh = () => setRefreshToken((value) => value + 1);

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Platform Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Runtime configuration derived from the deployed environment. Values are sanitised to avoid leaking secrets.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </section>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>System configuration</CardTitle>
          <CardDescription>
            Current environment snapshot sourced from the Nest configuration service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !config ? (
            <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {config ? (
            <div className="grid gap-6 md:grid-cols-2">
              <SettingsPanel
                title="Runtime"
                items={[
                  { label: 'Environment', value: config.environment },
                  { label: 'Port', value: String(config.runtime.port) }
                ]}
              />
              <SettingsPanel
                title="Database"
                items={[
                  { label: 'Protocol', value: config.database?.protocol ?? 'n/a' },
                  { label: 'Host', value: config.database?.host ?? 'n/a' },
                  { label: 'Port', value: config.database?.port ? String(config.database.port) : 'n/a' },
                  { label: 'Database', value: config.database?.database ?? 'n/a' }
                ]}
                hint={
                  config.database?.parameters
                    ? `Connection options: ${Object.entries(config.database.parameters)
                        .map(([key, value]) => `${key}=${value}`)
                        .join(', ')}`
                    : undefined
                }
              />
              <SettingsPanel
                title="Redis"
                items={[
                  { label: 'Protocol', value: config.redis.protocol ?? 'n/a' },
                  { label: 'Host', value: config.redis.host ?? 'n/a' },
                  { label: 'Port', value: config.redis.port ? String(config.redis.port) : 'n/a' },
                  { label: 'TLS enabled', value: config.redis.tls ? 'Yes' : 'No' }
                ]}
              />
              <SettingsPanel
                title="Features"
                items={[
                  { label: 'Prometheus metrics', value: config.features.metrics ? 'Enabled' : 'Disabled' }
                ]}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

function SettingsPanel({
  title,
  items,
  hint
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      {hint ? <p className="mt-3 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
