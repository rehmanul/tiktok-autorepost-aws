import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 60000,
            limit: 100
          },
          {
            name: 'medium',
            ttl: 600000,
            limit: 500
          },
          {
            name: 'long',
            ttl: 3600000,
            limit: 2000
          }
        ]
      }),
      inject: [ConfigService]
    })
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class ThrottlerConfigModule {}

