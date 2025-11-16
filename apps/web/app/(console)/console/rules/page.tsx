'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CheckCircle2, Plus, Repeat, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { rulesApi, type AutoPostRule } from '@/lib/api/rules';
import { connectionsApi, type Connection, type SocialPlatform } from '@/lib/api/connections';
import { useTenant } from '@/components/tenant/tenant-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';

dayjs.extend(relativeTime);

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  TWITTER: 'Twitter'
};

export default function RulesPage() {
  const { tenantId, tenant } = useTenant();
  const { user } = useAuth();
  const [rules, setRules] = useState<AutoPostRule[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    sourceConnectionId: '',
    destinationConnectionIds: [] as string[],
    name: ''
  });

  useEffect(() => {
    if (!tenantId || !user) return;

    const controller = new AbortController();
    setIsLoading(true);

    Promise.all([
      rulesApi.list({ tenantId, userId: user.id }),
      connectionsApi.list({ tenantId, userId: user.id })
    ])
      .then(([rulesData, connectionsData]) => {
        setRules(rulesData);
        setConnections(connectionsData);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [tenantId, user]);

  const tiktokConnections = useMemo(
    () => connections.filter((c) => c.platform === 'TIKTOK' && c.status === 'ACTIVE'),
    [connections]
  );

  const destinationConnections = useMemo(
    () => connections.filter((c) => c.platform !== 'TIKTOK' && c.status === 'ACTIVE'),
    [connections]
  );

  const getConnectionById = useCallback(
    (id: string) => connections.find((c) => c.id === id),
    [connections]
  );

  const handleCreateRule = async () => {
    if (!tenantId || !user || !createForm.sourceConnectionId || createForm.destinationConnectionIds.length === 0) {
      setError('Please select a TikTok source and at least one destination');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newRule = await rulesApi.create({
        tenantId,
        userId: user.id,
        sourceConnectionId: createForm.sourceConnectionId,
        destinationConnectionIds: createForm.destinationConnectionIds,
        name: createForm.name || undefined,
        isActive: true
      });

      setRules((prev) => [newRule, ...prev]);
      setShowCreateDialog(false);
      setCreateForm({ sourceConnectionId: '', destinationConnectionIds: [], name: '' });
      setSuccessMessage('Automation rule created successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleDestination = (connectionId: string) => {
    setCreateForm((prev) => ({
      ...prev,
      destinationConnectionIds: prev.destinationConnectionIds.includes(connectionId)
        ? prev.destinationConnectionIds.filter((id) => id !== connectionId)
        : [...prev.destinationConnectionIds, connectionId]
    }));
  };

  const activeRules = useMemo(() => rules.filter((r) => r.isActive), [rules]);
  const inactiveRules = useMemo(() => rules.filter((r) => !r.isActive), [rules]);

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Automation Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define mapping between TikTok sources and destination channels with preservation policies.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Active scope:{' '}
            <span className="font-semibold text-foreground">
              {tenant ? `${tenant.name} (${tenant.slug})` : 'All tenants'}
            </span>
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)} disabled={tiktokConnections.length === 0 || destinationConnections.length === 0}>
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </section>

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert className="mt-6 border-emerald-500/50 bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600">{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {tiktokConnections.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No active TikTok connections found. Connect a TikTok account first to create automation rules.
            </p>
          </CardContent>
        </Card>
      ) : destinationConnections.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No active destination connections found. Connect Instagram, YouTube, or Twitter accounts to create automation rules.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {activeRules.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Active Rules</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeRules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} getConnectionById={getConnectionById} />
            ))}
          </div>
        </section>
      )}

      {inactiveRules.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-muted-foreground">Inactive Rules</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveRules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} getConnectionById={getConnectionById} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && rules.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Repeat className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No automation rules yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first rule to automatically repost TikTok videos to other platforms.
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Select a TikTok source account and choose which platforms to automatically repost to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">TikTok Source Account</Label>
              <Select
                value={createForm.sourceConnectionId}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, sourceConnectionId: value }))}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select TikTok account..." />
                </SelectTrigger>
                <SelectContent>
                  {tiktokConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.accountDisplayName || conn.accountHandle} ({PLATFORM_LABELS[conn.platform]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destination Platforms</Label>
              <p className="text-xs text-muted-foreground">Select one or more platforms to automatically repost to</p>
              <div className="grid gap-3 rounded-lg border p-4">
                {destinationConnections.map((conn) => (
                  <label
                    key={conn.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={createForm.destinationConnectionIds.includes(conn.id)}
                      onChange={() => toggleDestination(conn.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{conn.accountDisplayName || conn.accountHandle}</div>
                      <div className="text-xs text-muted-foreground">{PLATFORM_LABELS[conn.platform]}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Rule Name (Optional)</Label>
              <input
                id="name"
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Personal TikTok to Instagram & YouTube"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule} disabled={isCreating || !createForm.sourceConnectionId || createForm.destinationConnectionIds.length === 0}>
              {isCreating ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RuleCard({
  rule,
  getConnectionById
}: {
  rule: AutoPostRule;
  getConnectionById: (id: string) => Connection | undefined;
}) {
  const sourceConnection = getConnectionById(rule.sourceConnectionId);
  const destinationConnections = rule.destinationConnectionIds
    .map((id) => getConnectionById(id))
    .filter((c): c is Connection => c !== undefined);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{rule.name || 'Unnamed Rule'}</CardTitle>
            <CardDescription className="mt-1">
              Created {dayjs(rule.createdAt).fromNow()}
            </CardDescription>
          </div>
          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
            {rule.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Source</div>
          <div className="mt-1 text-sm font-medium">
            {sourceConnection ? (
              <>
                {sourceConnection.accountDisplayName || sourceConnection.accountHandle}{' '}
                <span className="text-muted-foreground">({PLATFORM_LABELS[sourceConnection.platform]})</span>
              </>
            ) : (
              <span className="text-muted-foreground">Connection not found</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground">
            Destinations ({destinationConnections.length})
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {destinationConnections.length > 0 ? (
              destinationConnections.map((conn) => (
                <Badge key={conn.id} variant="outline" className="text-xs">
                  {PLATFORM_LABELS[conn.platform]}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No valid destinations</span>
            )}
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          Last updated {dayjs(rule.updatedAt).fromNow()}
        </div>
      </CardContent>
    </Card>
  );
}
