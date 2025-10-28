'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTenant } from './tenant-provider';

function formatCount(label: string, value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} ${label}`;
}

export function TenantSwitcher() {
  const { tenantId, tenant, tenants, isLoading, error, setTenantId, refresh } = useTenant();
  const [open, setOpen] = useState(false);

  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => a.name.localeCompare(b.name)),
    [tenants]
  );

  const activeLabel = tenant ? tenant.name : 'All tenants';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="inline-flex items-center gap-2 whitespace-nowrap"
          aria-label="Select tenant scope"
        >
          <span className="max-w-[10rem] truncate">{activeLabel}</span>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin opacity-70" /> : null}
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Tenant scope</p>
            <p className="text-xs text-muted-foreground">
              Filter dashboards and tables to a specific tenant.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refresh()}
            disabled={isLoading}
            aria-label="Refresh tenant list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-1">
          <ScopeOption
            label="All tenants"
            description="Aggregate data across every tenant."
            isActive={!tenantId}
            onSelect={() => {
              setTenantId(null);
              setOpen(false);
            }}
          />
          {sortedTenants.map((item) => (
            <ScopeOption
              key={item.id}
              label={item.name}
              description={`${formatCount('users', item.userCount)} • ${formatCount('connections', item.connectionCount)} • ${formatCount('rules', item.ruleCount)}`}
              isActive={tenantId === item.id}
              onSelect={() => {
                setTenantId(item.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ScopeOption({
  label,
  description,
  isActive,
  onSelect
}: {
  label: string;
  description: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition ${
        isActive ? 'border-primary bg-primary/10 text-primary' : 'hover:border-border/80 hover:bg-muted/80'
      }`}
    >
      <span className="mt-0.5">
        {isActive ? <Check className="h-4 w-4 text-primary" /> : <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
