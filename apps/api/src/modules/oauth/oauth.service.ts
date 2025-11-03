import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { InstagramOAuthStrategy } from './strategies/instagram.strategy';
import { YouTubeOAuthStrategy } from './strategies/youtube.strategy';
import { TwitterOAuthStrategy } from './strategies/twitter.strategy';
import { TikTokOAuthStrategy } from './strategies/tiktok.strategy';
import { ConnectionsService } from '../connections/connections.service';

interface OAuthStateData {
  tenantId: string;
  userId: string;
  platform: SocialPlatform;
  redirectUrl?: string;
  createdAt: number;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly redis: Redis;

  constructor(
    private readonly instagramStrategy: InstagramOAuthStrategy,
    private readonly youtubeStrategy: YouTubeOAuthStrategy,
    private readonly twitterStrategy: TwitterOAuthStrategy,
    private readonly tiktokStrategy: TikTokOAuthStrategy,
    private readonly connectionsService: ConnectionsService
  ) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const redisTls = (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';
    
    this.redis = new Redis(redisUrl, {
      tls: redisTls ? {} : undefined
    });
  }

  /**
   * Start OAuth flow - generate authorization URL
   */
  async startOAuth(params: {
    tenantId: string;
    userId: string;
    platform: SocialPlatform;
    redirectUrl?: string;
  }): Promise<{ authUrl: string; state: string }> {
    const state = randomBytes(32).toString('hex');

    // Store state data in Redis (10 minute expiry)
    const stateData: OAuthStateData = {
      tenantId: params.tenantId,
      userId: params.userId,
      platform: params.platform,
      redirectUrl: params.redirectUrl,
      createdAt: Date.now()
    };

    await this.redis.setex(
      `oauth:state:${state}`,
      600, // 10 minutes
      JSON.stringify(stateData)
    );

    let authUrl: string;

    switch (params.platform) {
      case SocialPlatform.INSTAGRAM:
        authUrl = this.instagramStrategy.getAuthorizationUrl(state);
        break;

      case SocialPlatform.YOUTUBE:
        authUrl = this.youtubeStrategy.getAuthorizationUrl(state);
        break;

      case SocialPlatform.TWITTER:
        const twitterAuth = await this.twitterStrategy.getAuthorizationUrl(state);
        authUrl = twitterAuth.authUrl;
        break;

      case SocialPlatform.TIKTOK:
        throw new BadRequestException('TikTok uses cookie-based authentication. Use /oauth/tiktok/connect endpoint');

      default:
        throw new BadRequestException(`Unsupported platform: ${params.platform}`);
    }

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback - exchange code for tokens and create connection
   */
  async handleCallback(params: {
    code: string;
    state: string;
    oauthToken?: string;
    oauthVerifier?: string;
  }): Promise<{ connectionId: string; redirectUrl?: string }> {
    // Retrieve and validate state
    const stateKey = `oauth:state:${params.state}`;
    const stateDataRaw = await this.redis.get(stateKey);

    if (!stateDataRaw) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    const stateData: OAuthStateData = JSON.parse(stateDataRaw);
    await this.redis.del(stateKey);

    // Platform-specific token exchange
    let connectionId: string;

    switch (stateData.platform) {
      case SocialPlatform.INSTAGRAM:
        connectionId = await this.handleInstagramCallback(params.code, stateData);
        break;

      case SocialPlatform.YOUTUBE:
        connectionId = await this.handleYouTubeCallback(params.code, stateData);
        break;

      case SocialPlatform.TWITTER:
        if (!params.oauthToken || !params.oauthVerifier) {
          throw new BadRequestException('Twitter OAuth requires oauth_token and oauth_verifier');
        }
        connectionId = await this.handleTwitterCallback(
          params.oauthToken,
          params.oauthVerifier,
          params.state,
          stateData
        );
        break;

      default:
        throw new BadRequestException(`Unsupported platform callback: ${stateData.platform}`);
    }

    return {
      connectionId,
      redirectUrl: stateData.redirectUrl
    };
  }

  /**
   * Handle TikTok cookie-based connection
   */
  async connectTikTok(params: {
    tenantId: string;
    userId: string;
    accountHandle: string;
    cookies: string;
  }): Promise<{ connectionId: string }> {
    let cookieString = params.cookies.trim();

    // Parse if JSON format
    if (cookieString.startsWith('[')) {
      cookieString = this.tiktokStrategy.parseCookieJson(cookieString);
    }

    // Validate cookies
    const validation = await this.tiktokStrategy.validateCookies(
      params.accountHandle,
      cookieString
    );

    if (!validation.valid) {
      throw new BadRequestException(`TikTok cookie validation failed: ${validation.error}`);
    }

    // Create connection
    const connection = await this.connectionsService.create({
      tenantId: params.tenantId,
      userId: params.userId,
      platform: SocialPlatform.TIKTOK,
      accountHandle: validation.username || params.accountHandle.replace('@', ''),
      accountDisplayName: validation.username || params.accountHandle.replace('@', ''),
      externalAccountId: validation.userId,
      accessToken: cookieString,
      scopes: ['read'],
      metadata: {
        sessionId: this.tiktokStrategy.extractSessionId(cookieString),
        connectedAt: new Date().toISOString()
      }
    });

    return { connectionId: connection.id };
  }

  private async handleInstagramCallback(code: string, stateData: OAuthStateData): Promise<string> {
    // Exchange code for short-lived token
    const tokenResponse = await this.instagramStrategy.exchangeCodeForToken(code);

    // Exchange for long-lived token
    const longLivedToken = await this.instagramStrategy.getLongLivedToken(tokenResponse.access_token);

    // Get user profile
    const profile = await this.instagramStrategy.getUserProfile(longLivedToken.access_token);

    // Try to get business account (required for posting)
    const businessAccount = await this.instagramStrategy.getBusinessAccount(
      longLivedToken.access_token,
      tokenResponse.user_id.toString()
    );

    const metadata: Record<string, unknown> = {
      userId: tokenResponse.user_id,
      accountType: profile.account_type
    };

    if (businessAccount) {
      metadata.instagramBusinessAccountId = businessAccount.instagramBusinessAccountId;
    }

    // Create connection
    const connection = await this.connectionsService.create({
      tenantId: stateData.tenantId,
      userId: stateData.userId,
      platform: SocialPlatform.INSTAGRAM,
      accountHandle: profile.username,
      accountDisplayName: profile.username,
      externalAccountId: profile.id,
      accessToken: longLivedToken.access_token,
      scopes: ['instagram_basic', 'instagram_content_publish'],
      expiresAt: new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString(),
      metadata
    });

    return connection.id;
  }

  private async handleYouTubeCallback(code: string, stateData: OAuthStateData): Promise<string> {
    // Exchange code for tokens
    const tokenResponse = await this.youtubeStrategy.exchangeCodeForToken(code);

    // Get channel info
    const channelInfo = await this.youtubeStrategy.getChannelInfo(tokenResponse.access_token);

    const metadata: Record<string, unknown> = {
      channelId: channelInfo.channelId,
      subscriberCount: channelInfo.subscriberCount,
      thumbnailUrl: channelInfo.thumbnailUrl,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI
    };

    // Create connection
    const connection = await this.connectionsService.create({
      tenantId: stateData.tenantId,
      userId: stateData.userId,
      platform: SocialPlatform.YOUTUBE,
      accountHandle: channelInfo.channelTitle,
      accountDisplayName: channelInfo.channelTitle,
      externalAccountId: channelInfo.channelId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      scopes: tokenResponse.scope?.split(' ') ?? [],
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      metadata
    });

    return connection.id;
  }

  private async handleTwitterCallback(
    oauthToken: string,
    oauthVerifier: string,
    state: string,
    stateData: OAuthStateData
  ): Promise<string> {
    // Exchange for access tokens and user info
    const result = await this.twitterStrategy.exchangeCodeForToken(oauthToken, oauthVerifier, state);

    const metadata: Record<string, unknown> = {
      userId: result.userId,
      displayName: result.displayName,
      profileImageUrl: result.profileImageUrl,
      twitterConsumerKey: process.env.TWITTER_CONSUMER_KEY,
      twitterConsumerSecret: process.env.TWITTER_CONSUMER_SECRET
    };

    // Create connection (access_secret stored as refresh token)
    const connection = await this.connectionsService.create({
      tenantId: stateData.tenantId,
      userId: stateData.userId,
      platform: SocialPlatform.TWITTER,
      accountHandle: result.username,
      accountDisplayName: result.displayName,
      externalAccountId: result.userId,
      accessToken: result.access_token,
      refreshToken: result.access_secret, // Twitter uses this as permanent secret
      scopes: ['tweet.read', 'tweet.write', 'users.read'],
      metadata
    });

    return connection.id;
  }
}
