import { IsOptional, IsString } from 'class-validator';

export class JobsOverviewQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;
}
