import { SocialPlatform } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

class ConnectionMetadataDto {
  [key: string]: unknown;
}

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsString()
  @IsNotEmpty()
  accountHandle!: string;

  @IsOptional()
  @IsString()
  accountDisplayName?: string;

  @IsOptional()
  @IsString()
  externalAccountId?: string;

  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  @Type(() => ConnectionMetadataDto)
  metadata?: Record<string, unknown>;
}
