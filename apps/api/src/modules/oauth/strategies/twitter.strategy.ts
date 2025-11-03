import { Injectable, Logger } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';

export interface TwitterOAuthConfig {
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
}

export interface TwitterTokenResponse {
  access_token: string;
  access_secret: string;
}

export interface TwitterUserInfo {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
}

@Injectable()
export class TwitterOAuthStrategy {
  private readonly logger = new Logger(TwitterOAuthStrategy.name);
  private readonly pendingAuths = new Map<string, { oauth_token_secret: string; codeVerifier: string }>();

  constructor(private readonly config: TwitterOAuthConfig) {}

  /**
   * Generate Twitter OAuth 1.0a authorization URL (3-legged)
   */
  async getAuthorizationUrl(state: string): Promise<{ authUrl: string; oauthToken: string }> {
    try {
      const client = new TwitterApi({
        appKey: this.config.consumerKey,
        appSecret: this.config.consumerSecret
      });

      const authLink = await client.generateAuthLink(this.config.callbackUrl, {
        linkMode: 'authorize'
      });

      // Store oauth_token_secret for later use
      this.pendingAuths.set(state, {
        oauth_token_secret: authLink.oauth_token_secret,
        codeVerifier: authLink.oauth_token
      });

      // Clean up after 10 minutes
      setTimeout(() => this.pendingAuths.delete(state), 10 * 60 * 1000);

      return {
        authUrl: authLink.url,
        oauthToken: authLink.oauth_token
      };
    } catch (error) {
      this.logger.error('Failed to generate Twitter auth URL', error);
      throw new Error(`Twitter authorization URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exchange OAuth verifier for access tokens
   */
  async exchangeCodeForToken(
    oauthToken: string,
    oauthVerifier: string,
    state: string
  ): Promise<TwitterTokenResponse & TwitterUserInfo> {
    try {
      const pendingAuth = this.pendingAuths.get(state);
      if (!pendingAuth) {
        throw new Error('Invalid or expired OAuth state');
      }

      const client = new TwitterApi({
        appKey: this.config.consumerKey,
        appSecret: this.config.consumerSecret,
        accessToken: oauthToken,
        accessSecret: pendingAuth.oauth_token_secret
      });

      const { client: loggedClient, accessToken, accessSecret } = await client.login(oauthVerifier);

      // Get user info
      const user = await loggedClient.v2.me({
        'user.fields': ['profile_image_url', 'username', 'name']
      });

      this.pendingAuths.delete(state);

      return {
        access_token: accessToken,
        access_secret: accessSecret,
        userId: user.data.id,
        username: user.data.username,
        displayName: user.data.name,
        profileImageUrl: user.data.profile_image_url
      };
    } catch (error) {
      this.logger.error('Twitter token exchange failed', error);
      throw new Error(`Failed to exchange Twitter authorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken: string, accessSecret: string): Promise<TwitterUserInfo> {
    try {
      const client = new TwitterApi({
        appKey: this.config.consumerKey,
        appSecret: this.config.consumerSecret,
        accessToken,
        accessSecret
      });

      const user = await client.v2.me({
        'user.fields': ['profile_image_url', 'username', 'name']
      });

      return {
        userId: user.data.id,
        username: user.data.username,
        displayName: user.data.name,
        profileImageUrl: user.data.profile_image_url
      };
    } catch (error) {
      this.logger.error('Failed to fetch Twitter user info', error);
      throw new Error(`Failed to fetch Twitter user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Twitter credentials
   */
  async validateToken(accessToken: string, accessSecret: string): Promise<boolean> {
    try {
      const client = new TwitterApi({
        appKey: this.config.consumerKey,
        appSecret: this.config.consumerSecret,
        accessToken,
        accessSecret
      });

      await client.v2.me();
      return true;
    } catch (error) {
      this.logger.warn('Twitter token validation failed', error);
      return false;
    }
  }
}
