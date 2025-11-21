'use client';

import { useCallback, useEffect, useState } from 'react';
import { connectionsApi, Connection, SocialPlatform } from '@/lib/api/connections';
import { useOAuth } from '@/lib/hooks/use-oauth';
import { ConnectionCard } from '@/components/connections/connection-card';
import { PlatformConnectButton } from '@/components/connections/platform-connect-button';
import { TikTokCookieModal } from '@/components/connections/tiktok-cookie-modal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useTenant } from '@/components/tenant/tenant-provider';
import { useAuth } from '@/components/auth/auth-provider';

export const dynamic = 'force-dynamic';

export default function ConnectionsPage() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);

  const loadConnections = useCallback(async () => {
    if (!tenantId || !user) return;
    try {
      setIsLoading(true);
      const data = await connectionsApi.list({
        tenantId,
        userId: user.id,
      });
      setConnections(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load connections';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user]);

  const { isConnecting, connectPlatform } = useOAuth({
    tenantId: tenantId ?? '',
    userId: user?.id ?? '',
    onSuccess: () => {
      setSuccessMessage('Account connected successfully!');
      loadConnections();
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error) => {
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    },
  });

  useEffect(() => {
    if (tenantId && user) {
      loadConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, user]);

  const handleConnect = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    
    if (platform === 'TIKTOK') {
      setShowTikTokModal(true);
    } else {
      connectPlatform(platform);
    }
  };

  const getConnectionsByPlatform = (platform: SocialPlatform) => {
    return connections.filter((c) => c.platform === platform);
  };

  const platforms: SocialPlatform[] = ['TIKTOK', 'INSTAGRAM', 'YOUTUBE', 'TWITTER'];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect your social media accounts to enable auto-posting
            </p>
          </div>
          <Button onClick={loadConnections} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Platform Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Platforms</TabsTrigger>
            {platforms.map((platform) => (
              <TabsTrigger key={platform} value={platform.toLowerCase()}>
                {platform}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* All Platforms */}
          <TabsContent value="all" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : (
              <>
                {/* Connect New Platform */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Connect New Platform</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {platforms.map((platform) => (
                      <PlatformConnectButton
                        key={platform}
                        platform={platform}
                        isConnecting={isConnecting && selectedPlatform === platform}
                        onConnect={handleConnect}
                        disabled={isConnecting}
                      />
                    ))}
                  </div>
                </div>

                {/* Connected Accounts */}
                {connections.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {connections.map((connection) => (
                        <ConnectionCard
                          key={connection.id}
                          connection={connection}
                          onReconnect={() => handleConnect(connection.platform)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!isLoading && connections.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No connections yet. Connect your first platform above!</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Individual Platform Tabs */}
          {platforms.map((platform) => (
            <TabsContent key={platform} value={platform.toLowerCase()} className="space-y-4">
              {/* Connect Button */}
              <div className="max-w-xs">
                <PlatformConnectButton
                  platform={platform}
                  isConnecting={isConnecting && selectedPlatform === platform}
                  onConnect={handleConnect}
                  disabled={isConnecting}
                />
              </div>

              {/* Connections for this platform */}
              {getConnectionsByPlatform(platform).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getConnectionsByPlatform(platform).map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      onReconnect={() => handleConnect(connection.platform)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No {platform} accounts connected yet</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* TikTok Cookie Modal */}
      <TikTokCookieModal
        open={showTikTokModal}
        onOpenChange={setShowTikTokModal}
        tenantId={tenantId ?? ''}
        userId={user?.id ?? ''}
        onSuccess={() => {
          setSuccessMessage('TikTok account connected successfully!');
          loadConnections();
          setTimeout(() => setSuccessMessage(null), 5000);
        }}
      />
    </div>
  );
}
