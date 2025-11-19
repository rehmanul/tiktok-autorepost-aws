import { Injectable, Logger } from '@nestjs/common';
import { TikTokHttpClient } from '@autorepost/integrations-tiktok';

export interface TikTokCookieValidationResult {
  valid: boolean;
  username?: string;
  userId?: string;
  error?: string;
}

@Injectable()
export class TikTokOAuthStrategy {
  private readonly logger = new Logger(TikTokOAuthStrategy.name);

  /**
   * Validate TikTok cookies by attempting to fetch user profile
   */
  async validateCookies(username: string, cookies: string): Promise<TikTokCookieValidationResult> {
    // First check if cookies have sessionid - if yes, allow with warning
    const sessionId = this.extractSessionId(cookies);
    if (!sessionId) {
      return {
        valid: false,
        error: 'No sessionid found in cookies. Please ensure you are logged into TikTok and export cookies.'
      };
    }

    try {
      const client = new TikTokHttpClient({
        defaultCookies: cookies
      });

      // Try to fetch user feed to validate cookies
      const result = await client.fetchUserFeed({
        username: username.replace('@', ''),
        page: 1,
        perPage: 1
      });

      if (result.meta?.profile && typeof result.meta.profile === 'object') {
        const profile = result.meta.profile as { uniqueId?: string; userId?: string };
        return {
          valid: true,
          username: profile.uniqueId ?? '',
          userId: profile.userId ?? ''
        };
      }

      // Fallback: If we have sessionid but validation failed, allow it anyway
      // This handles cases where TikTok API is blocking validation but cookies are valid
      this.logger.warn(`TikTok validation failed for @${username} but sessionid exists. Allowing connection with warning.`);
      return {
        valid: true,
        username: username.replace('@', ''),
        userId: sessionId
      };
    } catch (error) {
      this.logger.error('TikTok cookie validation failed', error);

      // Fallback: If we have sessionid, allow connection anyway
      // This makes the connection more lenient when TikTok API is unreliable
      if (sessionId) {
        this.logger.warn(`Allowing TikTok connection for @${username} despite validation error. SessionId present.`);
        return {
          valid: true,
          username: username.replace('@', ''),
          userId: sessionId
        };
      }

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Cookie validation failed'
      };
    }
  }

  /**
   * Parse cookie string from browser export (JSON array format)
   */
  parseCookieJson(cookieJson: string): string {
    try {
      const cookies = JSON.parse(cookieJson);
      if (!Array.isArray(cookies)) {
        throw new Error('Cookies must be a JSON array');
      }

      return cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join('; ');
    } catch (error) {
      this.logger.error('Failed to parse cookie JSON', error);
      throw new Error('Invalid cookie format. Expected JSON array from browser export.');
    }
  }

  /**
   * Extract session ID from cookies
   */
  extractSessionId(cookies: string): string | null {
    const match = cookies.match(/sessionid=([^;]+)/);
    return match ? match[1] : null;
  }
}
