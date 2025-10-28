import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class JobsRecentQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
