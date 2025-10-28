'use client';

import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Building2, Link2, RefreshCw, Search, Users, Workflow } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchTenants, type TenantSummary } from '@/lib/api/tenants';

dayjs.extend(relativeTime);

export default function TenantsPage() {
  const PAGE_SIZE = 25;
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsLoadingMore(false);

    fetchTenants({
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      signal: controller.signal
    })
      .then((result) => {
        setTenants(result.items);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load tenants');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedSearch, refreshToken, PAGE_SIZE]);

  const totals = useMemo(() => {
    return tenants.reduce(
      (acc, tenant) => {
        acc.tenants += 1;
        acc.users += tenant.userCount;
        acc.connections += tenant.connectionCount;
        acc.rules += tenant.ruleCount;
        return acc;
      },
      { tenants: 0, users: 0, connections: 0, rules: 0 }
    );
  }, [tenants]);

  const handleRefresh = () => setRefreshToken((value) => value + 1);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    const controller = new AbortController();
    setIsLoadingMore(true);

    fetchTenants({
      search: debouncedSearch || undefined,
      cursor: nextCursor,
      limit: PAGE_SIZE,
      signal: controller.signal
    })
      .then((result) => {
        setTenants((current) => [...current, ...result.items]);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load tenants');
      })
      .finally(() => setIsLoadingMore(false));
  }, [PAGE_SIZE, debouncedSearch, nextCursor]);

  return (
    <>
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Tenants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage multi-tenant boundaries, service tiers, and operational readiness.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tenants…"
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Building2}
          title="Tenants"
          value={formatNumber(totals.tenants)}
          description="Total active tenants in the registry."
        />
        <SummaryCard
          icon={Users}
          title="Users"
          value={formatNumber(totals.users)}
          description="Provisioned operators across all tenants."
        />
        <SummaryCard
          icon={Link2}
          title="Connections"
          value={formatNumber(totals.connections)}
          description="Source and destination accounts currently linked."
        />
        <SummaryCard
          icon={Workflow}
          title="Automation rules"
          value={formatNumber(totals.rules)}
          description="Active repost workflows configured by operators."
        />
      </section>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Tenant Registry</CardTitle>
          <CardDescription>Newest tenants first. Use search and pagination controls to explore the registry.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading && !tenants.length ? (
            <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!isLoading && tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants match the current filters.</p>
          ) : null}
          {tenants.length ? (
            <table className="min-w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border/70 px-3 py-2">Name</th>
                  <th className="border-b border-border/70 px-3 py-2">Slug</th>
                  <th className="border-b border-border/70 px-3 py-2">Users</th>
                  <th className="border-b border-border/70 px-3 py-2">Connections</th>
                  <th className="border-b border-border/70 px-3 py-2">Rules</th>
                  <th className="border-b border-border/70 px-3 py-2">Created</th>
                  <th className="border-b border-border/70 px-3 py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{tenant.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{tenant.slug}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatNumber(tenant.userCount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatNumber(tenant.connectionCount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatNumber(tenant.ruleCount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {dayjs(tenant.createdAt).format('MMM D, HH:mm')}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {tenant.lastActivityAt
                        ? `${dayjs(tenant.lastActivityAt).fromNow()} (${dayjs(tenant.lastActivityAt).format('MMM D, HH:mm')})`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  description
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-bold tracking-tight">{value}</span>
      </CardContent>
    </Card>
  );
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}
