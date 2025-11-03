import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface YouTubeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface YouTubeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface YouTubeChannelInfo {
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  subscriberCount?: string;
}

@Injectable()
export class YouTubeOAuthStrategy {
  private readonly logger = new Logger(YouTubeOAuthStrategy.name);
  private readonly oauth2Client: OAuth2Client;

  constructor(private readonly config: YouTubeOAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate YouTube authorization URL with PKCE
   */
  getAuthorizationUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent' // Force refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string): Promise<YouTubeTokenResponse> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token returned from YouTube');
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? undefined,
        expires_in: tokens.expiry_date 
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope ?? undefined
      };
    } catch (error) {
      this.logger.error('YouTube token exchange failed', error);
      throw new Error(`Failed to exchange YouTube authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });

      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error('No YouTube channel found for this account');
      }

      return {
        channelId: channel.id!,
        channelTitle: channel.snippet?.title || 'Unknown Channel',
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? undefined,
        subscriberCount: channel.statistics?.subscriberCount ?? undefined
      };
    } catch (error) {
      this.logger.error('Failed to fetch YouTube channel info', error);
      throw new Error(`Failed to fetch YouTube channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<YouTubeTokenResponse> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token returned from refresh');
      }

      return {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token ?? undefined,
        expires_in: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : 3600,
        token_type: credentials.token_type || 'Bearer',
        scope: credentials.scope || ''
      };
    } catch (error) {
      this.logger.error('YouTube token refresh failed', error);
      throw new Error(`Failed to refresh YouTube token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate token by checking quota
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });

      await youtube.channels.list({
        part: ['id'],
        mine: true
      });

      return true;
    } catch (error) {
      this.logger.warn('YouTube token validation failed', error);
      return false;
    }
  }
}
