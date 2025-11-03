import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { SocialPlatform } from '@prisma/client';

export class OAuthStartDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}
