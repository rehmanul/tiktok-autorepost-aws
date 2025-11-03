'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTenant } from '@/components/tenant/tenant-provider';
import { useAuth } from '@/components/auth/auth-provider';

export function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tenant, tenantId } = useTenant();
  
  const operatorName = user?.displayName ?? 'User';
  const operatorEmail = user?.email ?? '';
  const initials = getInitials(operatorName);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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
          <p className="text-xs text-muted-foreground">{operatorEmail}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {user?.role ?? 'USER'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Active scope: <span className="font-semibold text-foreground">{tenant ? tenant.name : 'All tenants'}</span>
          {tenantId ? ` (${tenantId})` : ''}
        </p>
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          Sign Out
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  const fallback = letters.join('');
  return fallback || 'U';
}
