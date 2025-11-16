'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RefreshCw, Search, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchUsers, type UserSummary } from '@/lib/api/users';
import { useTenant } from '@/components/tenant/tenant-provider';
import { UserConnectionsDialog } from '@/components/admin/user-connections-dialog';
import { useAuth } from '@/components/auth/auth-provider';

dayjs.extend(relativeTime);

const STATUS_BADGES: Record<UserSummary['status'], string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600',
  INACTIVE: 'bg-slate-500/10 text-slate-600',
  INVITED: 'bg-blue-500/10 text-blue-600'
};

const STATUS_FILTERS: Array<{ label: string; value: '' | UserSummary['status'] }> = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Invited', value: 'INVITED' }
];

const ROLE_FILTERS: Array<{ label: string; value: '' | UserSummary['role'] }> = [
  { label: 'All roles', value: '' },
  { label: 'Administrator', value: 'ADMIN' },
  { label: 'Operator', value: 'USER' }
];

export default function UsersPage() {
  const { tenantId, tenant } = useTenant();
  const { session } = useAuth();
  const PAGE_SIZE = 50;
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | UserSummary['status']>('');
  const [roleFilter, setRoleFilter] = useState<'' | UserSummary['role']>('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsLoadingMore(false);

    fetchUsers({
      tenantId: tenantId ?? undefined,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      role: roleFilter || undefined,
      limit: PAGE_SIZE,
      signal: controller.signal
    })
      .then((result) => {
        setUsers(result.items);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load user directory');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [tenantId, debouncedSearch, statusFilter, roleFilter, refreshToken, PAGE_SIZE]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [users]
  );

  const handleRefresh = () => setRefreshToken((value) => value + 1);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    const controller = new AbortController();
    setIsLoadingMore(true);

    fetchUsers({
      tenantId: tenantId ?? undefined,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      role: roleFilter || undefined,
      cursor: nextCursor,
      limit: PAGE_SIZE,
      signal: controller.signal
    })
      .then((result) => {
        setUsers((current) => [...current, ...result.items]);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to load user directory');
      })
      .finally(() => setIsLoadingMore(false));
  }, [PAGE_SIZE, debouncedSearch, statusFilter, roleFilter, nextCursor, tenantId]);

  return (
    <>
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">User Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administer tenant staff, automation operators, and platform administrators.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Active scope:{' '}
            <span className="font-semibold text-foreground">
              {tenant ? `${tenant.name} (${tenant.slug})` : 'All tenants'}
            </span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as '' | UserSummary['status'])}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-40"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as '' | UserSummary['role'])}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-40"
            aria-label="Filter by role"
          >
            {ROLE_FILTERS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Sorted alphabetically. Results are paginated for fast browsing.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading && !sortedUsers.length ? (
            <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!isLoading && sortedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users found for the current filters. Adjust the search query or tenant scope.
            </p>
          ) : null}
          {sortedUsers.length ? (
            <table className="min-w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border/70 px-3 py-2">Name</th>
                  <th className="border-b border-border/70 px-3 py-2">Email</th>
                  <th className="border-b border-border/70 px-3 py-2">Tenant</th>
                  <th className="border-b border-border/70 px-3 py-2">Role</th>
                  <th className="border-b border-border/70 px-3 py-2">Status</th>
                  <th className="border-b border-border/70 px-3 py-2">Connections</th>
                  <th className="border-b border-border/70 px-3 py-2">Rules</th>
                  <th className="border-b border-border/70 px-3 py-2">Jobs</th>
                  <th className="border-b border-border/70 px-3 py-2">Last login</th>
                  <th className="border-b border-border/70 px-3 py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{user.displayName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {user.tenant ? `${user.tenant.name} (${user.tenant.slug})` : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatRole(user.role)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGES[user.status]}`}>
                        {user.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedUser({ id: user.id, name: user.displayName })}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm"
                      >
                        <Eye className="h-3 w-3" />
                        {formatNumber(user.connectionCount)} connections
                      </button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatNumber(user.ruleCount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatNumber(user.jobCount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTimestamp(user.lastLoginAt) ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTimestamp(user.lastActivityAt) ?? '—'}
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

      {/* User Connections Dialog */}
      {selectedUser && session && (
        <UserConnectionsDialog
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          userId={selectedUser.id}
          userName={selectedUser.name}
          apiUrl={process.env.NEXT_PUBLIC_API_URL || ''}
          accessToken={session.access_token}
        />
      )}
    </>
  );
}

function formatRole(role: UserSummary['role']) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return null;
  }
  const date = dayjs(timestamp);
  return `${date.fromNow()} (${date.format('MMM D, HH:mm')})`;
}
