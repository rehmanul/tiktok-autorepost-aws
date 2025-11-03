import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { AuditService } from './services/audit.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('supabase.jwtSecret');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET must be configured');
        }
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: '1h'
          }
        };
      },
      inject: [ConfigService]
    }),
    DatabaseModule
  ],
  controllers: [AuthController, AdminController],
  providers: [AuthService, SupabaseService, AuditService, JwtStrategy],
  exports: [AuthService, SupabaseService, AuditService]
})
export class AuthModule {}

