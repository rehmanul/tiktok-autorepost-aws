import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class JobsRecentQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
