'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTenant } from '@/components/tenant/tenant-provider';

export function AccountMenu() {
  const operatorName = process.env.NEXT_PUBLIC_OPERATOR_NAME ?? 'Operator';
  const operatorEmail = process.env.NEXT_PUBLIC_OPERATOR_EMAIL;
  const tenantLabel = process.env.NEXT_PUBLIC_OPERATOR_TENANT ?? 'Multi-tenant session';
  const initials = getInitials(operatorName);
  const { tenant, tenantId } = useTenant();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2" aria-label="Open account menu">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{operatorName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{operatorName}</p>
          <p className="text-xs text-muted-foreground">
            {operatorEmail ?? 'Session authenticated via secure cookie'}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{tenantLabel}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Active scope: <span className="font-semibold text-foreground">{tenant ? tenant.name : 'All tenants'}</span>
          {tenantId ? ` (${tenantId})` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          Use the tenant selector in the header to change the operational context.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  const fallback = letters.join('');
  return fallback || 'OP';
}
