'use client';

import { useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Connection {
  id: string;
  platform: string;
  accountHandle: string;
  accountDisplayName: string | null;
  status: string;
  createdAt: string;
}

interface UserConnectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  apiUrl: string;
  accessToken: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  TWITTER: 'Twitter'
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  REVOKED: 'bg-gray-100 text-gray-800'
};

export function UserConnectionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  apiUrl,
  accessToken
}: UserConnectionsDialogProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;

    const loadConnections = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/connections?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load connections');
        }

        const data = await response.json();
        setConnections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connections');
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, [open, userId, apiUrl, accessToken]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            {userName}&apos;s Connected Accounts
          </DialogTitle>
          <DialogDescription>
            View all social media accounts connected by this user
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && connections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Plug className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No connected accounts yet</p>
          </div>
        )}

        {!isLoading && connections.length > 0 && (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">
                        {PLATFORM_NAMES[connection.platform] || connection.platform}
                      </span>
                      <Badge className={STATUS_COLORS[connection.status] || 'bg-gray-100 text-gray-800'}>
                        {connection.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{connection.accountHandle}
                      {connection.accountDisplayName && (
                        <span className="ml-1">• {connection.accountDisplayName}</span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Connected {new Date(connection.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
