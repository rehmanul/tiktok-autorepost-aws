import { apiClient } from './client';

export type SocialPlatform = 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'TWITTER';
export type ConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'ERROR' | 'REVOKED';

export interface Connection {
  id: string;
  tenantId: string;
  userId: string;
  platform: SocialPlatform;
  accountHandle: string;
  accountDisplayName?: string;
  status: ConnectionStatus;
  expiresAt?: string;
  lastSyncedAt?: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionsOverview {
  totalConnections: number;
  expiringWithin24h: number;
  byPlatform: Array<{
    platform: SocialPlatform;
    total: number;
    status: Record<ConnectionStatus, number>;
  }>;
  recent: Array<{
    id: string;
    tenantId: string;
    userId: string;
    platform: SocialPlatform;
    accountHandle: string;
    accountDisplayName?: string;
    status: ConnectionStatus;
    expiresAt?: string;
    lastSyncedAt?: string;
    updatedAt: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface OAuthStartResponse {
  authUrl: string;
  state: string;
}

export interface TikTokConnectRequest {
  tenantId: string;
  userId: string;
  accountHandle: string;
  cookies: string;
}

export interface TikTokConnectResponse {
  connectionId: string;
  success: boolean;
  message: string;
}

export const connectionsApi = {
  // Get connections list
  list: (params: { tenantId: string; userId?: string; platform?: SocialPlatform }) => {
    const query = new URLSearchParams();
    query.set('tenantId', params.tenantId);
    if (params.userId) query.set('userId', params.userId);
    if (params.platform) query.set('platform', params.platform);
    
    return apiClient.get<Connection[]>(`/connections?${query.toString()}`);
  },

  // Get connections overview
  overview: (tenantId?: string) => {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return apiClient.get<ConnectionsOverview>(`/connections/overview${query}`);
  },

  // Start Instagram OAuth
  startInstagramOAuth: (params: { tenantId: string; userId: string; redirectUrl?: string }) => {
    const query = new URLSearchParams({
      tenantId: params.tenantId,
      userId: params.userId,
    });
    if (params.redirectUrl) query.set('redirectUrl', params.redirectUrl);
    
    return apiClient.get<OAuthStartResponse>(`/oauth/instagram/start?${query.toString()}`);
  },

  // Start YouTube OAuth
  startYouTubeOAuth: (params: { tenantId: string; userId: string; redirectUrl?: string }) => {
    const query = new URLSearchParams({
      tenantId: params.tenantId,
      userId: params.userId,
    });
    if (params.redirectUrl) query.set('redirectUrl', params.redirectUrl);
    
    return apiClient.get<OAuthStartResponse>(`/oauth/youtube/start?${query.toString()}`);
  },

  // Start Twitter OAuth
  startTwitterOAuth: (params: { tenantId: string; userId: string; redirectUrl?: string }) => {
    const query = new URLSearchParams({
      tenantId: params.tenantId,
      userId: params.userId,
    });
    if (params.redirectUrl) query.set('redirectUrl', params.redirectUrl);
    
    return apiClient.get<OAuthStartResponse>(`/oauth/twitter/start?${query.toString()}`);
  },

  // Connect TikTok with cookies
  connectTikTok: (data: TikTokConnectRequest) => {
    return apiClient.post<TikTokConnectResponse>('/oauth/tiktok/connect', data);
  },

  // Update connection status
  updateStatus: (connectionId: string, status: ConnectionStatus, errorMessage?: string) => {
    return apiClient.patch<Connection>(`/connections/${connectionId}/status`, {
      status,
      errorMessage,
    });
  },
};
