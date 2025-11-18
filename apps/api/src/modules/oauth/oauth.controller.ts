import { Controller, Get, Post, Query, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SocialPlatform } from '@prisma/client';
import { OAuthService } from './oauth.service';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { TikTokCookieConnectionDto } from './dto/tiktok-cookie.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Get('instagram/start')
  async instagramStart(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('redirectUrl') redirectUrl?: string
  ) {
    return this.oauthService.startOAuth({
      tenantId,
      userId,
      platform: SocialPlatform.INSTAGRAM,
      redirectUrl
    });
  }

  @Public()
  @Get('instagram/callback')
  async instagramCallback(@Query() query: OAuthCallbackDto, @Res() res: Response) {
    if (query.error) {
      return res.redirect(
        `${process.env.WEB_APP_URL}/console/connections?error=${encodeURIComponent(query.error_description || query.error)}`
      );
    }

    if (!query.code || !query.state) {
      return res.redirect(
        `${process.env.WEB_APP_URL}/console/connections?error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    const result = await this.oauthService.handleCallback({
      code: query.code,
      state: query.state
    });

    const redirectUrl = result.redirectUrl || `${process.env.WEB_APP_URL}/console/connections`;
    return res.redirect(`${redirectUrl}?connectionId=${result.connectionId}&success=true`);
  }

  @Public()
  @Get('youtube/start')
  async youtubeStart(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('redirectUrl') redirectUrl?: string
  ) {
    return this.oauthService.startOAuth({
      tenantId,
      userId,
      platform: SocialPlatform.YOUTUBE,
      redirectUrl
    });
  }

  @Public()
  @Get('youtube/callback')
  async youtubeCallback(@Query() query: OAuthCallbackDto, @Res() res: Response) {
    if (query.error) {
      return res.redirect(
        `${process.env.WEB_APP_URL}/console/connections?error=${encodeURIComponent(query.error_description || query.error)}`
      );
    }

    if (!query.code || !query.state) {
      return res.redirect(
        `${process.env.WEB_APP_URL}/console/connections?error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    const result = await this.oauthService.handleCallback({
      code: query.code,
      state: query.state
    });

    const redirectUrl = result.redirectUrl || `${process.env.WEB_APP_URL}/console/connections`;
    return res.redirect(`${redirectUrl}?connectionId=${result.connectionId}&success=true`);
  }

  @Public()
  @Get('twitter/start')
  async twitterStart(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('redirectUrl') redirectUrl?: string
  ) {
    return this.oauthService.startOAuth({
      tenantId,
      userId,
      platform: SocialPlatform.TWITTER,
      redirectUrl
    });
  }

  @Public()
  @Get('twitter/callback')
  async twitterCallback(
    @Query('oauth_token') oauthToken: string,
    @Query('oauth_verifier') oauthVerifier: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    if (!oauthToken || !oauthVerifier || !state) {
      return res.redirect(
        `${process.env.WEB_APP_URL}/console/connections?error=Missing OAuth parameters`
      );
    }

    const result = await this.oauthService.handleCallback({
      code: '',
      state,
      oauthToken,
      oauthVerifier
    });

    const redirectUrl = result.redirectUrl || `${process.env.WEB_APP_URL}/console/connections`;
    return res.redirect(`${redirectUrl}?connectionId=${result.connectionId}&success=true`);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tiktok/connect')
  async tiktokConnect(@Body() dto: TikTokCookieConnectionDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping
    if (user.role !== 'ADMIN' && dto.tenantId !== user.tenantId) {
      dto.tenantId = user.tenantId;
    }
    if (dto.userId !== user.id && user.role !== 'ADMIN') {
      dto.userId = user.id;
    }
    
    const result = await this.oauthService.connectTikTok({
      tenantId: dto.tenantId,
      userId: dto.userId,
      accountHandle: dto.accountHandle,
      cookies: dto.cookies
    });

    return {
      connectionId: result.connectionId,
      success: true,
      message: 'TikTok account connected successfully'
    };
  }
}
