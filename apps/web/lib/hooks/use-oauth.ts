import { useState, useCallback } from 'react';
import { connectionsApi, SocialPlatform } from '../api/connections';

interface UseOAuthOptions {
  tenantId: string;
  userId: string;
  onSuccess?: (connectionId: string) => void;
  onError?: (error: Error) => void;
}

export function useOAuth({ tenantId, userId, onSuccess, onError }: UseOAuthOptions) {
  const [isConnecting, setIsConnecting] = useState(false);

  const checkConnectionSuccess = useCallback(async () => {
    // Check URL params for success
    const urlParams = new URLSearchParams(window.location.search);
    const connectionId = urlParams.get('connectionId');
    const success = urlParams.get('success');

    if (success === 'true' && connectionId) {
      onSuccess?.(connectionId);

      // Clean up URL params
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    setIsConnecting(false);
  }, [onSuccess]);

  const openOAuthPopup = useCallback(
    async (platform: SocialPlatform) => {
      setIsConnecting(true);

      try {
        let authUrl: string;

        // Get authorization URL
        switch (platform) {
          case 'INSTAGRAM':
            const igResponse = await connectionsApi.startInstagramOAuth({ tenantId, userId });
            authUrl = igResponse.authUrl;
            break;
          case 'YOUTUBE':
            const ytResponse = await connectionsApi.startYouTubeOAuth({ tenantId, userId });
            authUrl = ytResponse.authUrl;
            break;
          case 'TWITTER':
            const twResponse = await connectionsApi.startTwitterOAuth({ tenantId, userId });
            authUrl = twResponse.authUrl;
            break;
          default:
            throw new Error(`OAuth not supported for ${platform}`);
        }

        // Open OAuth popup
        const popup = window.open(
          authUrl,
          'oauth-popup',
          'width=600,height=700,left=200,top=100'
        );

        if (!popup) {
          throw new Error('Failed to open OAuth popup. Please allow popups.');
        }

        // Poll for popup close and check for success
        const pollInterval = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollInterval);
            checkConnectionSuccess();
          }
        }, 500);

        // Cleanup after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!popup.closed) {
            popup.close();
          }
          setIsConnecting(false);
        }, 5 * 60 * 1000);
      } catch (error) {
        setIsConnecting(false);
        onError?.(error instanceof Error ? error : new Error('OAuth failed'));
      }
    },
    [tenantId, userId, onError, checkConnectionSuccess]
  );

  return {
    isConnecting,
    connectPlatform: openOAuthPopup,
  };
}
