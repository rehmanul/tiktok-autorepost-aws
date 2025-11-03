import { IsEmail, IsString, MinLength, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { UserRole, AccountStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsUUID()
  tenantId!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}

