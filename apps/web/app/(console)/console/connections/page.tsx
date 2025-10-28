'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Plug } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchConnectionsOverview, type ConnectionsOverview } from '@/lib/api/connections';
import { useTenant } from '@/components/tenant/tenant-provider';

dayjs.extend(relativeTime);
const PLATFORM_LABELS: Record<ConnectionsOverview['byPlatform'][number]['platform'], string> = {
  TIKTOK: 'TikTok Sources',
  INSTAGRAM: 'Instagram Destinations',
  YOUTUBE: 'YouTube Destinations',
  TWITTER: 'Twitter Destinations'
};

const STATUS_LABELS: Record<ConnectionsOverview['recent'][number]['status'], string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  ERROR: 'Error',
  REVOKED: 'Revoked'
};

const STATUS_BADGES: Record<ConnectionsOverview['recent'][number]['status'], string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600',
  EXPIRED: 'bg-amber-500/10 text-amber-600',
  ERROR: 'bg-rose-500/10 text-rose-600',
  REVOKED: 'bg-slate-500/10 text-slate-600'
};

export default function ConnectionsPage() {
  const [overview, setOverview] = useState<ConnectionsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId, tenant } = useTenant();

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchConnectionsOverview({ tenantId: tenantId ?? undefined, signal: controller.signal })
      .then((data) => {
        setOverview(data);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load connection metrics');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [tenantId]);

  const platformBreakdown = useMemo(
    () =>
      (overview?.byPlatform ?? []).sort((a, b) =>
        PLATFORM_LABELS[a.platform].localeCompare(PLATFORM_LABELS[b.platform])
      ),
    [overview]
  );

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Platform Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time visibility into OAuth authorisations across tenants with status-aware drill downs.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Active scope:{' '}
            <span className="font-semibold text-foreground">
              {tenant ? `${tenant.name} (${tenant.slug})` : 'All tenants'}
            </span>
          </p>
        </div>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          <Plug className="h-4 w-4" />
          <span>
            {formatNumber(overview?.totalConnections)} total •{' '}
            {formatNumber(overview?.expiringWithin24h)} expiring within 24h
          </span>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>By Platform</CardTitle>
            <CardDescription>Status distribution by social network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {platformBreakdown.length ? (
              platformBreakdown.map((item) => (
                <div key={item.platform} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{PLATFORM_LABELS[item.platform]}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(item.total)} connected
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600">
                      {formatNumber(item.status.ACTIVE)} active
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600">
                      {formatNumber(item.status.EXPIRED)} expiring
                    </span>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600">
                      {formatNumber(item.status.ERROR)} error
                    </span>
                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-slate-600">
                      {formatNumber(item.status.REVOKED)} revoked
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState isLoading={isLoading} message="No connections found for this environment yet." />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
            <CardDescription>Connections with OAuth sessions expiring within the next 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {overview?.expiringWithin24h ? (
              <p>
                {formatNumber(overview.expiringWithin24h)} connection{overview.expiringWithin24h === 1 ? '' : 's'} require
                proactive refresh. Trigger the token refresh queue or prompt operators to re-authorise.
              </p>
            ) : (
              <EmptyState isLoading={isLoading} message="No connections are within the 24h expiry window." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Changes</CardTitle>
            <CardDescription>Latest connection updates ordered by refresh/sync activity.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {overview && overview.recent.length ? (
              <table className="min-w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="border-b border-border/70 px-3 py-2">Platform</th>
                    <th className="border-b border-border/70 px-3 py-2">Handle</th>
                    <th className="border-b border-border/70 px-3 py-2">Status</th>
                    <th className="border-b border-border/70 px-3 py-2">Expires</th>
                    <th className="border-b border-border/70 px-3 py-2">Last sync</th>
                    <th className="border-b border-border/70 px-3 py-2">Tenant</th>
                    <th className="border-b border-border/70 px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recent.map((connection) => (
                    <tr key={connection.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{PLATFORM_LABELS[connection.platform]}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {connection.accountDisplayName
                          ? `${connection.accountDisplayName} (${connection.accountHandle})`
                          : connection.accountHandle}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGES[connection.status]}`}>
                          {STATUS_LABELS[connection.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {connection.expiresAt ? dayjs(connection.expiresAt).format('MMM D, HH:mm') : '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {connection.lastSyncedAt ? dayjs(connection.lastSyncedAt).fromNow() : 'never'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {connection.tenant
                          ? `${connection.tenant.name} (${connection.tenant.slug})`
                          : connection.tenantId}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {dayjs(connection.updatedAt).format('MMM D, HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState isLoading={isLoading} message="No recent connection updates yet." />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function EmptyState({ isLoading, message }: { isLoading: boolean; message: string }) {
  if (isLoading) {
    return <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>;
  }
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

function formatNumber(value: number | undefined | null) {
  if (value == null) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(value);
}
