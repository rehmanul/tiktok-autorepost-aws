'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchJobsOverview, fetchRecentJobs, type JobStatus, type JobsOverview, type RecentJob } from '@/lib/api/jobs';
import { useTenant } from '@/components/tenant/tenant-provider';

dayjs.extend(duration);

const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  RUNNING: 'Running',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
};

const STATUS_BADGES: Partial<Record<JobStatus, string>> = {
  RUNNING: 'bg-blue-500/10 text-blue-600',
  SUCCEEDED: 'bg-emerald-500/10 text-emerald-600',
  FAILED: 'bg-rose-500/10 text-rose-600',
  PENDING: 'bg-amber-500/10 text-amber-600',
  SCHEDULED: 'bg-amber-500/10 text-amber-600',
  CANCELLED: 'bg-slate-500/10 text-slate-600'
};

export default function JobsPage() {
  const [overview, setOverview] = useState<JobsOverview | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId, tenant } = useTenant();

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    Promise.all([
      fetchJobsOverview({ tenantId: tenantId ?? undefined, signal: controller.signal }),
      fetchRecentJobs({ tenantId: tenantId ?? undefined, limit: 25, signal: controller.signal })
    ])
      .then(([overviewData, recent]) => {
        setOverview(overviewData);
        setRecentJobs(recent);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load job telemetry');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [tenantId]);

  const statusBreakdown = useMemo(() => {
    if (!overview) {
      return [];
    }
    return (Object.keys(overview.statusCounts) as JobStatus[])
      .map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: overview.statusCounts[status] ?? 0
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [overview]);

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Processing Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Backlog and execution telemetry for the repost pipeline across ingest, transform, and publish stages.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Active scope:{' '}
          <span className="font-semibold text-foreground">
            {tenant ? `${tenant.name} (${tenant.slug})` : 'All tenants'}
          </span>
        </p>
      </section>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Status distribution (last 24h)</CardTitle>
            <CardDescription>Counts by job status updated within the past 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {statusBreakdown.length ? (
              statusBreakdown.map((entry) => (
                <div key={entry.status} className="rounded-lg border border-border/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{entry.label}</div>
                  <div className="mt-1 text-2xl font-semibold">{formatNumber(entry.count)}</div>
                </div>
              ))
            ) : (
              <Placeholder isLoading={isLoading} message="No job executions recorded yet." />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Runtime insights</CardTitle>
            <CardDescription>Highlights from the current execution window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">{formatNumber(overview?.backlogCount)}</strong> jobs waiting in the queue.
            </p>
            <p>
              Average completion: <strong className="text-foreground">{formatDuration(overview?.averageDurationSeconds)}</strong>
            </p>
            <p>
              Window start:{' '}
              <strong className="text-foreground">
                {overview ? dayjs(overview.timeframeStart).format('MMM D, HH:mm') : '—'}
              </strong>
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Latest entries across all tenants, ordered by creation time.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {recentJobs.length ? (
              <table className="min-w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="border-b border-border/70 px-3 py-2">Job</th>
                    <th className="border-b border-border/70 px-3 py-2">Kind</th>
                    <th className="border-b border-border/70 px-3 py-2">Status</th>
                    <th className="border-b border-border/70 px-3 py-2">Attempts</th>
                    <th className="border-b border-border/70 px-3 py-2">Duration</th>
                    <th className="border-b border-border/70 px-3 py-2">Tenant</th>
                    <th className="border-b border-border/70 px-3 py-2">Updated</th>
                    <th className="border-b border-border/70 px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{job.id}</td>
                      <td className="px-3 py-2 text-muted-foreground">{job.kind}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGES[job.status] ?? 'bg-slate-500/10 text-slate-600'}`}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{job.attempts}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatJobDuration(job.startedAt, job.completedAt)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {job.tenant ? `${job.tenant.name} (${job.tenant.slug})` : job.tenantId}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {dayjs(job.updatedAt).format('MMM D, HH:mm')}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {job.error?.message ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Placeholder isLoading={isLoading} message="No jobs have been created yet." />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Placeholder({ isLoading, message }: { isLoading: boolean; message: string }) {
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

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) {
    return '—';
  }
  const dur = dayjs.duration(seconds, 'seconds');
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${dur.minutes()}m ${dur.seconds()}s`;
  }
  return `${Math.floor(seconds / 3600)}h ${dur.minutes()}m`;
}

function formatJobDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) {
    return '—';
  }
  const seconds = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  return formatDuration(seconds);
}
