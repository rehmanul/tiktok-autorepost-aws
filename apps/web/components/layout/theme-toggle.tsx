'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const themes: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }> = [
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> }
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = themes.find((item) => item.value === theme) ?? themes[2];

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-medium text-muted-foreground sm:inline-block">Theme</span>
      <div className="flex items-center gap-1 rounded-full border bg-card p-1">
        {themes.map((item) => (
          <Button
            key={item.value}
            size="icon"
            variant={item.value === current.value ? 'default' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setTheme(item.value)}
            aria-label={`Use ${item.label} theme`}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </div>
  );
}
