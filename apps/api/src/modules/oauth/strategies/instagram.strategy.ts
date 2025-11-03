import { Injectable, Logger } from '@nestjs/common';
import { request as undiciRequest } from 'undici';

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface InstagramTokenResponse {
  access_token: string;
  user_id: number;
  expires_in?: number;
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  account_type?: string;
}

export interface InstagramBusinessAccount {
  instagramBusinessAccountId: string;
  username: string;
}

@Injectable()
export class InstagramOAuthStrategy {
  private readonly logger = new Logger(InstagramOAuthStrategy.name);

  constructor(private readonly config: InstagramOAuthConfig) {}

  /**
   * Generate Instagram authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'instagram_basic,instagram_content_publish,instagram_manage_comments',
      response_type: 'code',
      state
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
      code
    });

    const response = await undiciRequest('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (response.statusCode >= 400) {
      const errorBody = await response.body.text();
      this.logger.error(`Instagram token exchange failed: ${errorBody}`);
      throw new Error(`Failed to exchange Instagram authorization code: ${response.statusCode}`);
    }

    const data: any = await response.body.json();
    return {
      access_token: data.access_token,
      user_id: data.user_id,
      expires_in: data.expires_in
    };
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.config.clientSecret,
      access_token: shortLivedToken
    });

    const response = await undiciRequest(`https://graph.instagram.com/access_token?${params.toString()}`, {
      method: 'GET'
    });

    if (response.statusCode >= 400) {
      const errorBody = await response.body.text();
      this.logger.error(`Instagram long-lived token exchange failed: ${errorBody}`);
      throw new Error('Failed to get long-lived Instagram token');
    }

    const data: any = await response.body.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 5184000 // 60 days default
    };
  }

  /**
   * Get user profile from Instagram Graph API
   */
  async getUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    const params = new URLSearchParams({
      fields: 'id,username,account_type',
      access_token: accessToken
    });

    const response = await undiciRequest(`https://graph.instagram.com/me?${params.toString()}`, {
      method: 'GET'
    });

    if (response.statusCode >= 400) {
      const errorBody = await response.body.text();
      this.logger.error(`Instagram profile fetch failed: ${errorBody}`);
      throw new Error('Failed to fetch Instagram user profile');
    }

    return response.body.json() as Promise<InstagramUserProfile>;
  }

  /**
   * Get Instagram Business Account ID (required for posting)
   */
  async getBusinessAccount(accessToken: string, userId: string): Promise<InstagramBusinessAccount | null> {
    try {
      // First get Facebook pages
      const pagesParams = new URLSearchParams({
        fields: 'instagram_business_account{id,username}',
        access_token: accessToken
      });

      const response = await undiciRequest(`https://graph.facebook.com/v19.0/${userId}/accounts?${pagesParams.toString()}`, {
        method: 'GET'
      });

      if (response.statusCode >= 400) {
        this.logger.warn('Could not fetch Facebook pages for Instagram business account');
        return null;
      }

      const data: any = await response.body.json();
      
      if (data.data && data.data.length > 0) {
        const pageWithInstagram = data.data.find((page: any) => page.instagram_business_account);
        
        if (pageWithInstagram?.instagram_business_account) {
          return {
            instagramBusinessAccountId: pageWithInstagram.instagram_business_account.id,
            username: pageWithInstagram.instagram_business_account.username
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.warn('Error fetching Instagram business account', error);
      return null;
    }
  }

  /**
   * Refresh long-lived token (can be refreshed if > 24 hours old and < 60 days to expiry)
   */
  async refreshToken(accessToken: string): Promise<{ access_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: accessToken
    });

    const response = await undiciRequest(`https://graph.instagram.com/refresh_access_token?${params.toString()}`, {
      method: 'GET'
    });

    if (response.statusCode >= 400) {
      const errorBody = await response.body.text();
      this.logger.error(`Instagram token refresh failed: ${errorBody}`);
      throw new Error('Failed to refresh Instagram token');
    }

    const data: any = await response.body.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 5184000
    };
  }
}
