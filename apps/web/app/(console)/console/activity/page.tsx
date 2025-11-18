'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAuditEvents, type AuditEvent } from '@/lib/api/activity';
import { useTenant } from '@/components/tenant/tenant-provider';

dayjs.extend(relativeTime);

export const dynamic = 'force-dynamic';

export default function ActivityPage() {
  const { tenantId, tenant } = useTenant();
  const PAGE_SIZE = 50;
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsLoadingMore(false);

    fetchAuditEvents({
      tenantId: tenantId ?? undefined,
      limit: PAGE_SIZE,
      signal: controller.signal
    })
      .then((result) => {
        setEvents(result.items);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load activity feed');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [tenantId, refreshToken, PAGE_SIZE]);

  const handleRefresh = () => {
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }
    const interval = setInterval(() => {
      setRefreshToken((value) => value + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    const controller = new AbortController();
    setIsLoadingMore(true);

    fetchAuditEvents({
      tenantId: tenantId ?? undefined,
      cursor: nextCursor,
      limit: PAGE_SIZE,
      signal: controller.signal
    })
      .then((result) => {
        setEvents((current) => [...current, ...result.items]);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load activity feed');
      })
      .finally(() => setIsLoadingMore(false));
  }, [PAGE_SIZE, nextCursor, tenantId]);

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Recent Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chronological ledger of tenant actions, automation results, and operational interventions.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Active scope:{' '}
            <span className="font-semibold text-foreground">
              {tenant ? `${tenant.name} (${tenant.slug})` : 'All tenants'}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant={autoRefreshEnabled ? 'default' : 'outline'}
            className="text-sm"
            onClick={() => setAutoRefreshEnabled((value) => !value)}
          >
            {autoRefreshEnabled ? 'Auto refresh: On' : 'Auto refresh: Off'}
          </Button>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            Latest audit events captured by the platform. Entries are ordered by most recent updates first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && !events.length ? (
            <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!isLoading && events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit events recorded for the selected scope yet.
            </p>
          ) : null}
          {events.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
          {hasMore ? (
            <div className="flex justify-center">
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

function ActivityRow({ event }: { event: AuditEvent }) {
  const actor = event.user
    ? `${event.user.displayName ?? event.user.email} (${event.user.email})`
    : 'System';

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{event.action}</p>
          <p className="text-xs text-muted-foreground">
            {actor} • {event.tenant.name} ({event.tenant.slug})
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {dayjs(event.createdAt).fromNow()} • {dayjs(event.createdAt).format('MMM D, HH:mm')}
        </span>
      </div>
      {event.metadata ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
          {formatMetadata(event.metadata)}
        </pre>
      ) : null}
    </div>
  );
}

function formatMetadata(metadata: unknown) {
  if (metadata == null) {
    return '';
  }
  if (typeof metadata === 'string') {
    return metadata;
  }
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}
