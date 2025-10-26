'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AccountMenu } from '@/components/layout/account-menu';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden w-64 border-r bg-background lg:block">
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4">
            <div className="lg:hidden">
              <Button variant="outline" size="icon" aria-label="Toggle navigation">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Autorepost Dashboard
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <AccountMenu />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
