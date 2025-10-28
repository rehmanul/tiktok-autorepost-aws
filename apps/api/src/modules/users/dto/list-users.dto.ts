import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AccountStatus, UserRole } from '@prisma/client';

export class ListUsersDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsEnum(AccountStatus, {
    message: 'status must be a valid AccountStatus value'
  })
  status?: AccountStatus;

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'role must be a valid UserRole value'
  })
  role?: UserRole;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  })
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
