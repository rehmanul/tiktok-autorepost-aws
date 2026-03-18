'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AccountMenu } from '@/components/layout/account-menu';
import { TenantProvider } from '@/components/tenant/tenant-provider';
import { TenantSwitcher } from '@/components/tenant/tenant-switcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <TenantProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <aside className="hidden w-64 border-r bg-background lg:block">
          <SidebarNav />
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4">
              <div className="lg:hidden">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Toggle navigation">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0">
                    <SidebarNav onNavigate={() => setOpen(false)} />
                  </SheetContent>
                </Sheet>
              </div>
              <Link href="/console" className="text-lg font-semibold tracking-tight">
                Autorepost Dashboard
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <TenantSwitcher />
                <ThemeToggle />
                <AccountMenu />
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </TenantProvider>
  );
}
