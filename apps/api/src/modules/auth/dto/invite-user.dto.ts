import { IsEmail, IsString, MinLength, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsUUID()
  tenantId!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

