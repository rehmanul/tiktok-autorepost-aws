import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { InstagramOAuthStrategy } from './strategies/instagram.strategy';
import { YouTubeOAuthStrategy } from './strategies/youtube.strategy';
import { TwitterOAuthStrategy } from './strategies/twitter.strategy';
import { TikTokOAuthStrategy } from './strategies/tiktok.strategy';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ConnectionsModule],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    {
      provide: InstagramOAuthStrategy,
      useFactory: () => {
        return new InstagramOAuthStrategy({
          clientId: process.env.FACEBOOK_APP_ID!,
          clientSecret: process.env.FACEBOOK_APP_SECRET!,
          redirectUri: process.env.FACEBOOK_REDIRECT_URI!
        });
      }
    },
    {
      provide: YouTubeOAuthStrategy,
      useFactory: () => {
        return new YouTubeOAuthStrategy({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: process.env.GOOGLE_REDIRECT_URI!
        });
      }
    },
    {
      provide: TwitterOAuthStrategy,
      useFactory: () => {
        return new TwitterOAuthStrategy({
          consumerKey: process.env.TWITTER_CONSUMER_KEY!,
          consumerSecret: process.env.TWITTER_CONSUMER_SECRET!,
          callbackUrl: process.env.TWITTER_CALLBACK_URL!
        });
      }
    },
    TikTokOAuthStrategy
  ],
  exports: [OAuthService]
})
export class OAuthModule {}
