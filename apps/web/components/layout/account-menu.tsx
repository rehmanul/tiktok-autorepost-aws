'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function AccountMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2" aria-label="Open account menu">
          <Avatar className="h-8 w-8">
            <AvatarFallback>AA</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">Admin Operator</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Admin Operator</p>
          <p className="text-xs text-muted-foreground">admin@autorepost.io</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <button className="w-full text-left">Manage profile</button>
          <button className="w-full text-left">Switch tenant</button>
          <button className="w-full text-left text-destructive">Sign out</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
