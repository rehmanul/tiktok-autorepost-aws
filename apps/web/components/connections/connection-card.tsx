'use client';

import { Connection } from '@/lib/api/connections';
import { PlatformIcon, getPlatformConfig } from './platform-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';

interface ConnectionCardProps {
  connection: Connection;
  onReconnect?: (connectionId: string) => void;
}

const statusConfig = {
  ACTIVE: { icon: CheckCircle2, label: 'Active', color: 'text-green-600' },
  EXPIRED: { icon: Clock, label: 'Expired', color: 'text-orange-600' },
  ERROR: { icon: AlertCircle, label: 'Error', color: 'text-red-600' },
  REVOKED: { icon: XCircle, label: 'Revoked', color: 'text-gray-600' },
};

export function ConnectionCard({ connection, onReconnect }: ConnectionCardProps) {
  const platformConfig = getPlatformConfig(connection.platform);
  const status = statusConfig[connection.status];
  const StatusIcon = status.icon;

  const isExpiringSoon = connection.expiresAt
    ? new Date(connection.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={connection.platform} size={40} />
            <div>
              <h3 className="font-semibold text-sm">{platformConfig.name}</h3>
              <p className="text-sm text-muted-foreground">@{connection.accountHandle}</p>
            </div>
          </div>
          <Badge
            variant={connection.status === 'ACTIVE' ? 'default' : 'secondary'}
            className="gap-1"
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {connection.accountDisplayName && (
          <div className="text-xs text-muted-foreground">
            Display: {connection.accountDisplayName}
          </div>
        )}

        {connection.expiresAt && (
          <div className="text-xs">
            <span className="text-muted-foreground">Expires: </span>
            <span className={isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
              {new Date(connection.expiresAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {connection.lastSyncedAt && (
          <div className="text-xs text-muted-foreground">
            Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
          </div>
        )}

        {connection.status !== 'ACTIVE' && onReconnect && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onReconnect(connection.id)}
          >
            Reconnect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
