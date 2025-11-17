'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ArrowUpRight, FlameKindling, Plug, Repeat, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchDashboardOverview, type DashboardOverview } from '@/lib/api/dashboard';
import { useTenant } from '@/components/tenant/tenant-provider';

type Platform = DashboardOverview['connectionHealth'][number]['platform'];

const PLATFORM_LABELS: Record<Platform, string> = {
  TIKTOK: 'TikTok Sources',
  INSTAGRAM: 'Instagram Destinations',
  YOUTUBE: 'YouTube Destinations',
  TWITTER: 'Twitter Destinations'
};

const DEFAULT_HEALTH: DashboardOverview['connectionHealth'] = [
  { platform: 'TIKTOK', healthy: 0, warning: 0, critical: 0 },
  { platform: 'INSTAGRAM', healthy: 0, warning: 0, critical: 0 },
  { platform: 'YOUTUBE', healthy: 0, warning: 0, critical: 0 },
  { platform: 'TWITTER', healthy: 0, warning: 0, critical: 0 }
];

export default function HomePage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId, tenant } = useTenant();

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    fetchDashboardOverview({ tenantId: tenantId ?? undefined, signal: controller.signal })
      .then((result) => {
        setOverview(result);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load dashboard data');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [tenantId]);

  const summaryCards = useMemo(
    () => [
      {
        title: 'Tenants',
        description: 'Organisations currently active on the platform',
        value: formatNumber(overview?.totals.tenants)
      },
      {
        title: 'Platform Connections',
        description: 'Authorised TikTok, Instagram, YouTube & Twitter accounts',
        value: formatNumber(overview?.totals.connections)
      },
      {
        title: 'Automation Rules',
        description: 'Operational repost workflows managed across tenants',
        value: formatNumber(overview?.totals.rules)
      },
      {
        title: 'Successful Reposts (24h)',
        description: 'Cross-posted jobs completed without retry in the last 24 hours',
        value: formatNumber(overview?.totals.successfulRepostsLast24h)
      }
    ],
    [overview]
  );

  const connectionHealth = (overview?.connectionHealth ?? DEFAULT_HEALTH).sort((a, b) =>
    a.platform.localeCompare(b.platform)
  );

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-8 text-white shadow-2xl mb-6">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Operations Overview</h1>
          <p className="mt-2 text-blue-50 text-base">
            Monitor live automation telemetry, OAuth health, and onboarding throughput across the selected scope.
          </p>
          <p className="mt-3 text-sm text-cyan-100">
            Active scope:{' '}
            <span className="font-semibold text-white bg-white/20 px-3 py-1 rounded-full">
              {tenant ? `${tenant.name} (${tenant.slug})` : 'All tenants'}
            </span>
          </p>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((stat, index) => {
          const gradients = [
            'from-cyan-500 to-blue-500',
            'from-blue-500 to-purple-500',
            'from-purple-500 to-pink-500',
            'from-pink-500 to-rose-500'
          ];
          return (
            <Card key={stat.title} className="shadow-lg border-0 overflow-hidden">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradients[index % 4]}`} />
              <CardHeader className="gap-1 pt-6">
                <CardTitle className="text-sm font-semibold text-foreground">{stat.title}</CardTitle>
                <CardDescription className="text-xs">{stat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className={`text-4xl font-bold tracking-tight bg-gradient-to-r ${gradients[index % 4]} bg-clip-text text-transparent`}>
                  {stat.value}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
                <Plug className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Connection Health</CardTitle>
                <CardDescription>
                  Real counts by platform, grouped by the underlying OAuth session status.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {connectionHealth.map((item) => (
              <StatusRow
                key={item.platform}
                label={PLATFORM_LABELS[item.platform]}
                healthy={item.healthy}
                warning={item.warning}
                critical={item.critical}
              />
            ))}
            {overview ? null : <EmptyHint isLoading={isLoading} />}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Repeat className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Automation Throughput</CardTitle>
                <CardDescription>
                  Distribution of repost jobs over the last 24 hours with live retry posture.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressRow
              label="Completed"
              count={overview?.automation.completed ?? 0}
              percentage={overview?.automation.completedPercentage ?? 0}
              tone="success"
            />
            <ProgressRow
              label="Retrying"
              count={overview?.automation.retrying ?? 0}
              percentage={overview?.automation.retryingPercentage ?? 0}
              tone="warning"
            />
            <ProgressRow
              label="Failed"
              count={overview?.automation.failed ?? 0}
              percentage={overview?.automation.failedPercentage ?? 0}
              tone="danger"
            />
            {overview ? null : <EmptyHint isLoading={isLoading} />}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Onboarding Velocity</CardTitle>
                <CardDescription>Weekly movement across tenancy provisioning and user activation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListRow
              label="New tenants (last 7d)"
              value={formatNumber(overview?.onboarding.newTenantsLast7d)}
            />
            <ListRow
              label="Invited users (last 7d)"
              value={formatNumber(overview?.onboarding.invitedUsersLast7d)}
            />
            <ListRow
              label="Active users (last 7d)"
              value={formatNumber(overview?.onboarding.activeUsersLast7d)}
            />
            <ListRow
              label="Provisioning SLA compliance"
              value={
                overview?.onboarding.provisioningSlaCompliance == null
                  ? '—'
                  : `${overview.onboarding.provisioningSlaCompliance.toFixed(1)}%`
              }
              highlight={Boolean(overview?.onboarding.provisioningSlaCompliance)}
            />
            {overview ? null : <EmptyHint isLoading={isLoading} />}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FlameKindling className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Incident Feed</CardTitle>
                <CardDescription>Latest failed jobs surfaced for operations engineers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {overview && overview.incidents.length === 0 ? (
              <p className="text-muted-foreground">No failed jobs recorded in the last 7 days.</p>
            ) : null}
            {overview
              ? overview.incidents.map((incident) => (
                  <AlertRow
                    key={incident.id}
                    status={incident.status}
                    message={incident.message}
                    occurredAt={incident.occurredAt}
                  />
                ))
              : null}
            {overview ? null : <EmptyHint isLoading={isLoading} />}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StatusRow({
  label,
  healthy,
  warning,
  critical
}: {
  label: string;
  healthy: number;
  warning: number;
  critical: number;
}) {
  const total = healthy + warning + critical;
  const width = (value: number) => (total === 0 ? 0 : (value / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">
          {healthy} healthy • {warning} warning • {critical} critical
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-full w-full">
          <span className="h-full bg-emerald-500" style={{ width: `${width(healthy)}%` }} />
          <span className="h-full bg-amber-400" style={{ width: `${width(warning)}%` }} />
          <span className="h-full bg-rose-500" style={{ width: `${width(critical)}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  count,
  percentage,
  tone
}: {
  label: string;
  count: number;
  percentage: number;
  tone: 'success' | 'warning' | 'danger';
}) {
  const color =
    tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatNumber(count)} • {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <span className={`block h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ListRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={highlight ? 'text-sm font-semibold text-emerald-500' : 'text-sm font-medium'}>{value}</span>
    </div>
  );
}

function AlertRow({
  status,
  message,
  occurredAt
}: {
  status: 'new' | 'investigating' | 'mitigated';
  message: string;
  occurredAt: string;
}) {
  const badge =
    status === 'new'
      ? 'bg-blue-500/10 text-blue-500'
      : status === 'investigating'
        ? 'bg-amber-500/10 text-amber-500'
        : 'bg-emerald-500/10 text-emerald-500';

  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 p-3">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${badge}`}>{status}</span>
      <div className="flex-1">
        <p className="text-sm leading-5 text-foreground">{message}</p>
        <span className="mt-1 block text-xs text-muted-foreground">
          {dayjs(occurredAt).format('MMM D, HH:mm')}
        </span>
      </div>
    </div>
  );
}

function EmptyHint({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) {
    return null;
  }
  return (
    <div className="animate-pulse rounded-md border border-dashed border-border/70 bg-muted/50 p-3 text-xs text-muted-foreground">
      Loading live data…
    </div>
  );
}

function formatNumber(value: number | undefined | null) {
  if (value == null) {
    return '—';
  }
  return new Intl.NumberFormat('en-US').format(value);
}
