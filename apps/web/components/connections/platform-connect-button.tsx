'use client';

import { useState } from 'react';
import { SocialPlatform } from '@/lib/api/connections';
import { PlatformIcon, getPlatformConfig } from './platform-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';

interface PlatformConnectButtonProps {
  platform: SocialPlatform;
  isConnecting: boolean;
  onConnect: (platform: SocialPlatform) => void;
  disabled?: boolean;
}

export function PlatformConnectButton({
  platform,
  isConnecting,
  onConnect,
  disabled,
}: PlatformConnectButtonProps) {
  const config = getPlatformConfig(platform);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={platform} size={40} />
          <CardTitle className="text-base">{config.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => onConnect(platform)}
          disabled={isConnecting || disabled}
          className="w-full"
          style={{
            backgroundColor: config.color,
            color: 'white',
          }}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Connect {config.name}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
