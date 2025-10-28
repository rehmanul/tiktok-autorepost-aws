'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Cog, LayoutDashboard, Plug, Repeat, Upload, Users, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/console', label: 'Overview', icon: LayoutDashboard },
  { href: '/console/connections', label: 'Connections', icon: Plug },
  { href: '/console/rules', label: 'Automation Rules', icon: Repeat },
  { href: '/console/jobs', label: 'Processing Jobs', icon: Workflow },
  { href: '/console/activity', label: 'Activity', icon: Upload },
  { href: '/console/users', label: 'User Directory', icon: Users },
  { href: '/console/tenants', label: 'Tenants', icon: Building2 },
  { href: '/console/settings', label: 'Settings', icon: Cog }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Autorepost</div>
        <div className="mt-1 text-xl font-bold text-foreground">Operator Console</div>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        v0.1.0 • Multi-tenant automation platform blueprint
      </div>
    </div>
  );
}
